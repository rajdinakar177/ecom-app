import { NextRequest } from "next/server";
import { connectDB } from "@/app/lib/db/mongoose";
import User from "@/app//models/User";
import { generateSecureToken, tokenExpiry } from "@/app//lib/auth/tokens";
import { sendPasswordResetEmail } from "@/app//lib/email/mailer";
import { apiSuccess, apiError } from "@/app//lib/api/response";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return apiError("Email is required.", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // SECURITY: Always return the same response whether or not the email exists.
    // This prevents email enumeration — an attacker cannot probe which emails
    // are registered by observing different responses.
    const genericMessage =
      "If an account exists with this email, a password reset link has been sent.";

    if (!user) {
      return apiSuccess(null, genericMessage);
    }

    // Generate a secure token
    const { rawToken, hashedToken } = generateSecureToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordTokenExpiry = tokenExpiry(60); // 1 hour
    await user.save();

    // rawToken goes in the URL — it's URL-safe hex, no encoding needed.
    // hashedToken stays in the DB.
    await sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      token: rawToken,
    });

    return apiSuccess(null, genericMessage);
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}