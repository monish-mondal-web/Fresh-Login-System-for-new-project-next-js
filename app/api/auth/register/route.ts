import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendVerificationEmail } from "@/utils/mailer";

export async function POST(req: Request) {
  try {
    let { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    // 1. Input Normalization
    email = email.toLowerCase().trim();
    name = name.trim();

    // 2. Server-side Password Hardening
    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber) {
      return NextResponse.json({ message: "Password must contain uppercase, lowercase and numbers" }, { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    const otpNextResend = new Date(Date.now() + 1 * 60 * 1000); // 1 min lock natively
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.isVerified) {
        return NextResponse.json({ message: "User already exists" }, { status: 409 });
      } else {
        // Enforce rate limiter during overlapping registrations
        if (existingUser.otpNextResend && new Date() < existingUser.otpNextResend) {
          return NextResponse.json(
            { message: "Rate limit active", nextResend: existingUser.otpNextResend }, 
            { status: 429 }
          );
        }

        await User.updateOne(
          { email },
          { 
            $set: { 
              verificationOTP: otp, 
              otpExpiry, 
              otpNextResend,
              otpResendCount: 0,
              otpFailures: 0,
              name, 
              password: hashedPassword 
            } 
          }
        );
        
        await sendVerificationEmail(email, otp);
        return NextResponse.json({ message: "Verification email resent", nextResend: otpNextResend }, { status: 201 });
      }
    }

    await User.create({
      name,
      email,
      password: hashedPassword,
      verificationOTP: otp,
      otpExpiry,
      otpNextResend,
      otpResendCount: 0,
      otpFailures: 0,
    });
    
    await sendVerificationEmail(email, otp);

    return NextResponse.json({ message: "User created, OTP sent", nextResend: otpNextResend }, { status: 201 });
  } catch (error) {
    console.error("Error creating user", error);
    return NextResponse.json(
      { message: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
