import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ message: "Missing email or OTP" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: "User already verified" }, { status: 400 });
    }

    // 1. Brute-force protection
    if (user.otpFailures >= 5) {
      return NextResponse.json(
        { message: "Too many failed attempts. Please request a new code." }, 
        { status: 429 }
      );
    }

    // Check OTP validity
    if (user.verificationOTP !== otp) {
      await User.updateOne({ email }, { $inc: { otpFailures: 1 } });
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return NextResponse.json({ message: "Verification code has expired" }, { status: 400 });
    }

    // OTP is completely valid. Verify user and permanently destroy all lockouts.
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.otpExpiry = undefined;
    user.otpNextResend = undefined;
    user.otpResendCount = 0;
    user.otpFailures = 0; // Reset failures on success
    await user.save();

    return NextResponse.json({ message: "Email successfully verified!" }, { status: 200 });
  } catch (error) {
    console.error("Verification error", error);
    return NextResponse.json(
      { message: "An error occurred during verification", error: String(error) },
      { status: 500 }
    );
  }
}
