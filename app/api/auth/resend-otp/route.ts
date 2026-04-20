import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendVerificationEmail } from "@/utils/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Missing email" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: "User already verified" }, { status: 400 });
    }

    // 1. Check if user is locked out by exponential backoff
    if (user.otpNextResend && new Date() < user.otpNextResend) {
      return NextResponse.json(
        { 
          message: "Please wait before requesting another code", 
          nextResend: user.otpNextResend 
        }, 
        { status: 429 }
      );
    }

    // 2. Clear penalty tier if they waited out the 24-Hour ban successfully
    let count = user.otpResendCount || 0;
    if (count >= 3 && user.otpNextResend && new Date() > user.otpNextResend) {
      count = 0;
    }

    // 3. Determine next tier lockout window
    let delayMinutes = 1;
    if (count === 0) delayMinutes = 3; // 2nd Manual Request 
    else if (count === 1) delayMinutes = 10; // 3rd Manual Request
    else if (count >= 2) delayMinutes = 24 * 60; // 4th Manual Request -> 24 Hr Ban

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const otpNextResend = new Date(Date.now() + delayMinutes * 60 * 1000);

    // 4. Force atomic physical overwrite to prevent any Mongoose driver caching
    await User.updateOne(
      { email },
      { 
        $set: { 
          verificationOTP: otp, 
          otpExpiry,
          otpNextResend,
          otpResendCount: count + 1,
          otpFailures: 0
        } 
      }
    );

    await sendVerificationEmail(email, otp);

    return NextResponse.json(
      { message: "OTP sent successfully", nextResend: otpNextResend }, 
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP error", error);
    return NextResponse.json(
      { message: "An error occurred", error: String(error) },
      { status: 500 }
    );
  }
}
