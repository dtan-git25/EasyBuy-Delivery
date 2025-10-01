import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendEmail, emailTemplates } from "./email-service";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || typeof stored !== 'string') {
    return false;
  }
  
  const parts = stored.split(".");
  if (parts.length !== 2) {
    return false;
  }
  
  const [hashed, salt] = parts;
  if (!hashed || !salt) {
    return false;
  }
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// Helper function to create admin/owner accounts
export async function createSystemAccount(userData: {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'owner';
  firstName: string;
  lastName: string;
  middleName?: string;
}) {
  // Check for existing username
  const existingUser = await storage.getUserByUsername(userData.username);
  if (existingUser) {
    throw new Error("Username already exists");
  }

  // Check for existing email
  const existingEmail = await storage.getUserByEmail(userData.email);
  if (existingEmail) {
    throw new Error("Email already registered");
  }

  // Create user with hashed password
  const hashedPassword = await hashPassword(userData.password);
  
  const newUser = await storage.createUser({
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    role: userData.role,
    firstName: userData.firstName,
    middleName: userData.middleName || null,
    lastName: userData.lastName,
    
    // Default values for required fields
    prefix: null,
    age: null,
    gender: null,
    phone: null,
    lotHouseNo: null,
    street: null,
    barangay: null,
    cityMunicipality: null,
    province: null,
    landmark: null,
    driversLicenseNo: null,
    licenseValidityDate: null,
    storeName: null,
    storeAddress: null,
    storeContactNo: null,
    
    // System fields - Admin and Owner are auto-approved
    approvalStatus: 'approved' as const,
    isActive: true
  });

  return newUser;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check for existing username
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Check for existing email
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Validate allowed roles for public registration
      const allowedRoles = ['customer', 'rider', 'merchant'];
      if (!allowedRoles.includes(req.body.role)) {
        return res.status(400).json({ error: "Invalid role. Only Customer, Rider, and Merchant registration is allowed." });
      }

      // Map frontend field names to database column names
      const userData = {
        username: req.body.username,
        email: req.body.email,
        password: await hashPassword(req.body.password),
        role: req.body.role,
        
        // Personal information mapping
        prefix: req.body.prefix || null,
        firstName: req.body.firstName || null,
        middleName: req.body.middleName || null,
        lastName: req.body.lastName || null,
        age: req.body.age || null,
        gender: req.body.gender || null,
        
        // Address mapping
        lotHouseNo: req.body.lotHouseNo || null,
        street: req.body.street || null,
        barangay: req.body.barangay || null,
        cityMunicipality: req.body.cityMunicipality || null,
        province: req.body.province || null,
        landmark: req.body.landmark || null,
        
        // Contact information
        phone: req.body.phone || null,
        
        // Rider-specific fields
        driversLicenseNo: req.body.driversLicenseNo || null,
        licenseValidityDate: req.body.licenseValidityDate ? new Date(req.body.licenseValidityDate) : null,
        
        // Merchant-specific fields
        storeName: req.body.storeName || null,
        storeAddress: req.body.storeAddress || null,
        storeContactNo: req.body.storeContactNo || null,
        
        // System fields
        approvalStatus: req.body.role === 'customer' ? 'approved' as const : 'pending' as const,
        isActive: true
      };

      const user = await storage.createUser(userData);

      // If registering as a rider, create rider profile automatically
      if (user.role === 'rider') {
        try {
          await storage.createRider({
            userId: user.id,
            vehicleType: 'Motorcycle', // Default value, can be updated later
            vehicleModel: 'To be specified',
            plateNumber: 'To be specified',
            licenseNumber: req.body.driversLicenseNo || 'To be specified',
            documentsStatus: 'incomplete' // Documents not yet uploaded
          });
          console.log(`Created rider profile for user ${user.id}`);
        } catch (riderError) {
          console.error('Failed to create rider profile:', riderError);
          // Don't fail registration if rider profile creation fails
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Handle database constraint errors
      if (error?.code === '23505') {
        if (error?.constraint === 'users_email_unique') {
          return res.status(400).json({ error: "Email already registered" });
        }
        if (error?.constraint === 'users_username_unique') {
          return res.status(400).json({ error: "Username already exists" });
        }
      }
      
      // Handle not-null constraint violations
      if (error?.code === '23502') {
        return res.status(400).json({ error: `Missing required field: ${error?.column}` });
      }
      
      // Handle other errors
      return res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Test endpoint for SendGrid configuration (Owner only)
  app.post("/api/test-email", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Only owners can test email configuration
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: "Only owners can test email configuration" });
      }

      const { testEmail } = req.body;
      if (!testEmail) {
        return res.status(400).json({ error: "Test email address is required" });
      }

      console.log("Testing SendGrid configuration...");
      
      // Test email
      const emailSent = await sendEmail({
        to: testEmail,
        from: "noreply@easybuydelivery.com",
        subject: "Easy Buy Delivery - Email Configuration Test",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Email Configuration Test</h2>
            <p>This is a test email to verify SendGrid configuration.</p>
            <p>If you received this email, the SendGrid integration is working correctly.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
        text: `Email Configuration Test - If you received this email, SendGrid is working. Timestamp: ${new Date().toISOString()}`
      });

      if (emailSent) {
        res.status(200).json({ 
          success: true, 
          message: "Test email sent successfully. Check the recipient inbox." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test email. Check server logs for details." 
        });
      }

    } catch (error) {
      console.error("Email test error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Email test failed with error. Check server logs for details." 
      });
    }
  });

  // Owner-only endpoint to create admin/owner accounts
  app.post("/api/admin/create-system-account", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Only owners can create admin/owner accounts
      if (req.user.role !== 'owner') {
        return res.status(403).json({ error: "Only owners can create administrative accounts" });
      }

      const { username, email, password, role, firstName, lastName, middleName } = req.body;

      // Validate required fields
      if (!username || !email || !password || !role || !firstName || !lastName) {
        return res.status(400).json({ error: "All required fields must be provided" });
      }

      // Validate role
      if (!['admin', 'owner'].includes(role)) {
        return res.status(400).json({ error: "Role must be either 'admin' or 'owner'" });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Create the system account
      const newUser = await createSystemAccount({
        username,
        email,
        password,
        role,
        firstName,
        lastName,
        middleName
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);

    } catch (error: any) {
      console.error("System account creation error:", error);
      
      // Handle specific error types
      if (error.message === "Username already exists") {
        return res.status(400).json({ error: "Username already exists" });
      }
      if (error.message === "Email already registered") {
        return res.status(400).json({ error: "Email already registered" });
      }

      res.status(500).json({ error: "Failed to create system account" });
    }
  });

  // Password reset request endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await storage.updateUserPasswordResetToken(user.id, resetToken, resetExpiry);

      // Create reset link
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

      // Send email
      const emailTemplate = emailTemplates.passwordReset(user.firstName, resetToken, resetLink);
      const emailSent = await sendEmail({
        to: user.email,
        from: "noreply@easybuydelivery.com",
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      });

      if (!emailSent) {
        console.error("Failed to send password reset email");
        return res.status(500).json({ error: "Failed to send password reset email" });
      }

      res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Password reset confirmation endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        updatedAt: new Date()
      });

      res.status(200).json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Password reset confirmation error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
}
