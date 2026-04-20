import nodemailer from "nodemailer";
import { env } from "./env";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.EMAIL_SERVER_USER,
    pass: env.EMAIL_SERVER_PASSWORD,
  },
});

export const sendVerificationEmail = async (to: string, otp: string) => {
  const mailOptions = {
    from: `"Fresh Resume" <${env.EMAIL_SERVER_USER}>`,
    to,
    subject: "Verify your Fresh Resume account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Verification Required</h2>
        <p style="color: #475569; font-size: 16px; line-height: 24px;">
          Thanks for signing up for Fresh Resume! To complete your registration and secure your account, please use the verification code below.
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; text-align: center; border-radius: 8px; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb;">
            ${otp}
          </span>
        </div>
        
        <p style="color: #475569; font-size: 15px;">
          This code securely expires in exactly <strong>15 minutes</strong>.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 13px;">
          If you didn't request a verification code from Fresh Resume, please aggressively ignore this mail. Do not share this code.
        </p>
      </div>
    `,
  };


  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (to: string, otp: string) => {
  const mailOptions = {
    from: `"Fresh Resume Security" <${env.EMAIL_SERVER_USER}>`,
    to,
    subject: "Reset your Fresh Resume password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 16px; line-height: 24px;">
          We received a request to reset the password for your Fresh Resume account. Enter the verification code below to authorize this reset.
        </p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 24px; text-align: center; border-radius: 8px; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #dc2626;">
            ${otp}
          </span>
        </div>
        
        <p style="color: #475569; font-size: 15px;">
          This secure code expires in exactly <strong>15 minutes</strong>.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 13px;">
          If you did not request a password reset, your account is safe and you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
