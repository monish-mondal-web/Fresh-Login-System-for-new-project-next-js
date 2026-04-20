import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendPasswordResetEmail } from "@/utils/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Missing email" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "If your email is registered, you will receive a reset OTP." }, { status: 200 });
    }

    // 1. Check Rate Limit
    if (user.otpNextResend && new Date() < user.otpNextResend) {
      return NextResponse.json(
        { 
          message: "Please wait before requesting another code", 
          nextResend: user.otpNextResend 
        }, 
        { status: 429 }
      );
    }

    // 2. Escalation Logic (Share same trackers as verify flow for global SMTP safety)
    let count = user.otpResendCount || 0;
    if (count >= 3 && user.otpNextResend && new Date() > user.otpNextResend) {
      count = 0;
    }

    let delayMinutes = 1;
    if (count === 1) delayMinutes = 3;
    else if (count === 2) delayMinutes = 10;
    else if (count >= 3) delayMinutes = 24 * 60;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetOTPExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const otpNextResend = new Date(Date.now() + delayMinutes * 60 * 1000);

    await User.updateOne(
      { email },
      { 
        $set: { 
          resetOTP: otp, 
          resetOTPExpiry,
          otpNextResend,
          otpResendCount: count + 1,
          otpFailures: 0
        } 
      }
    );

    await sendPasswordResetEmail(email, otp);

    return NextResponse.json(
      { 
        message: "If your email is registered, you will receive a reset OTP.",
        nextResend: otpNextResend
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot Password error", error);
    return NextResponse.json(
      { message: "An error occurred", error: String(error) },
      { status: 500 }
    );
  }
}
