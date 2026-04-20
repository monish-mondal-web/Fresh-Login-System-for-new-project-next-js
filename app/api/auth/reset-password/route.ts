import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters long" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // 1. Brute-force protection
    if (user.otpFailures >= 5) {
      return NextResponse.json(
        { message: "Too many failed attempts. Please request a new reset code." }, 
        { status: 429 }
      );
    }

    // Check reset OTP validity
    if (!user.resetOTP || user.resetOTP !== otp) {
      await User.updateOne({ email }, { $inc: { otpFailures: 1 } });
      return NextResponse.json({ message: "Invalid or expired reset code" }, { status: 400 });
    }

    if (!user.resetOTPExpiry || new Date() > user.resetOTPExpiry) {
      return NextResponse.json({ message: "Reset code has expired" }, { status: 400 });
    }

    // OTP is valid. Hash new password and physically destroy the reset token lock
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { email },
      { 
        $set: { password: hashedPassword, otpFailures: 0 }, // Reset on success
        $unset: { resetOTP: 1, resetOTPExpiry: 1 } 
      }
    );

    return NextResponse.json({ message: "Password successfully reset!" }, { status: 200 });
  } catch (error) {
    console.error("Reset Password error", error);
    return NextResponse.json(
      { message: "An error occurred during password reset", error: String(error) },
      { status: 500 }
    );
  }
}
