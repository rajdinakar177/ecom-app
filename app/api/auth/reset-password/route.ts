import { NextRequest } from "next/server";
import bcrypt from "bcrypt";

import { connectDB } from "@/app//lib/db/mongoose";
import User from "@/app//models/User";
import { hashToken } from "@/app//lib/auth/tokens";
import { apiSuccess, apiError } from "@/app//lib/api/response";

/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and sets the new password.
 * The token in the request body is the raw hex token from the email URL.
 * We hash it and compare to what's stored in the DB.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return apiError("Token and new password are required.", 400);
    }

    if (password.length < 8) {
      return apiError("Password must be at least 8 characters.", 400);
    }

    // Hash the incoming raw token to match against the stored hash
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordTokenExpiry: { $gt: new Date() },
    }).select("+forgotPasswordToken +forgotPasswordTokenExpiry");

    if (!user) {
      return apiError(
        "Invalid or expired reset link. Please request a new one.",
        400
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);

    // Clear the reset token so the link cannot be reused
    user.forgotPasswordToken = undefined;
    user.forgotPasswordTokenExpiry = undefined;

    await user.save();

    return apiSuccess(
      null,
      "Password reset successfully. You can now log in with your new password."
    );
  } catch (error) {
    console.error("[POST /api/auth/reset-password]", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}