import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set - email notifications will be disabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.log('SENDGRID_API_KEY not set. Email would be sent:', params);
      return true; // Simulate success when no API key
    }

    console.log('Attempting to send email via SendGrid:', {
      to: params.to,
      from: params.from,
      subject: params.subject,
      hasHtml: !!params.html,
      hasText: !!params.text
    });

    const result = await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });

    console.log('SendGrid email sent successfully:', {
      to: params.to,
      messageId: result[0]?.headers?.['x-message-id'],
      statusCode: result[0]?.statusCode
    });
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      response: error.response?.body || error.response,
      to: params.to,
      from: params.from
    });
    
    // Log specific SendGrid error details
    if (error.response && error.response.body) {
      console.error('SendGrid API response body:', JSON.stringify(error.response.body, null, 2));
    }
    
    return false;
  }
}

// Email Templates for Philippine Market
export const emailTemplates = {
  // Customer registration with OTP
  customerRegistrationOTP: (firstName: string, otpCode: string) => ({
    subject: "Welcome to Easy Buy Delivery - Verify Your Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Welcome to Easy Buy Delivery!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for registering with Easy Buy Delivery. Your account has been created successfully!</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3>Your OTP Code</h3>
          <p style="font-size: 24px; font-weight: bold; color: #059669; letter-spacing: 3px;">${otpCode}</p>
          <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes</p>
        </div>
        
        <p>You can now order from your favorite restaurants and enjoy fast delivery across the Philippines!</p>
        <p>Salamat,<br>Easy Buy Delivery Team</p>
      </div>
    `,
    text: `Welcome to Easy Buy Delivery! Your OTP code is: ${otpCode}. This code will expire in 10 minutes.`
  }),

  // Rider registration approval
  riderApproval: (firstName: string, username: string, password: string) => ({
    subject: "Easy Buy Delivery - Rider Account Approved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Congratulations! Your Rider Account is Approved</h2>
        <p>Hi ${firstName},</p>
        <p>Great news! Your rider application has been approved by our admin team.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Login Details</h3>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <p>You can now start accepting delivery orders and earn income with Easy Buy Delivery!</p>
        <p>Please change your password after your first login for security.</p>
        <p>Welcome to the team,<br>Easy Buy Delivery Admin</p>
      </div>
    `,
    text: `Your rider account has been approved! Username: ${username}, Password: ${password}`
  }),

  // Merchant registration approval
  merchantApproval: (storeName: string, ownerName: string, username: string, password: string) => ({
    subject: "Easy Buy Delivery - Merchant Account Approved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Your Restaurant is Ready for Business!</h2>
        <p>Hi ${ownerName},</p>
        <p>Excellent! Your merchant application for <strong>${storeName}</strong> has been approved.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Login Details</h3>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <p>You can now start managing your menu, receiving orders, and growing your business with Easy Buy Delivery!</p>
        <p>Please change your password after your first login for security.</p>
        <p>Mabuhay ang inyong negosyo,<br>Easy Buy Delivery Admin</p>
      </div>
    `,
    text: `Your merchant account for ${storeName} has been approved! Username: ${username}, Password: ${password}`
  }),

  // Password reset email template
  passwordReset: (firstName: string, resetToken: string, resetLink: string) => ({
    subject: "Easy Buy Delivery - Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password for your Easy Buy Delivery account.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3>Reset Your Password</h3>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Reset Password</a>
          <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">This link will expire in 1 hour for security</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280;">
          If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
        
        <p style="font-size: 14px; color: #6b7280;">
          If the button doesn't work, copy and paste this link in your browser:<br>
          ${resetLink}
        </p>
        
        <p>Stay safe,<br>Easy Buy Delivery Team</p>
      </div>
    `,
    text: `Password reset requested for your Easy Buy Delivery account. Reset your password using this link: ${resetLink} (expires in 1 hour)`
  })
};