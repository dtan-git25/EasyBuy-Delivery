import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

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
        approvalStatus: req.body.role === 'customer' || req.body.role === 'admin' ? 'approved' : 'pending',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user = await storage.createUser(userData);

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
}
