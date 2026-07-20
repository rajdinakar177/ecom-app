import { NextRequest } from "next/server";
import { connectDB } from "@/app/lib/db/mongoose";
import User from "@/app/models/User";
import { hashToken } from "@/app/lib/auth/tokens";
import { apiSuccess, apiError } from "@/app/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return apiError("Verification token is required.", 400);
    }

    // Hash the incoming raw token to compare against what's stored in the DB.
    // We never stored the raw token — only its SHA-256 hash.
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      verifyToken: hashedToken,
      verifyTokenExpiry: { $gt: new Date() }, // Token must not be expired
    }).select("+verifyToken +verifyTokenExpiry");

    if (!user) {
      return apiError(
        "Invalid or expired verification link. Please request a new one.",
        400
      );
    }

    // Mark user as verified and clear the token fields
    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    return apiSuccess(null, "Email verified successfully. You can now log in.");
  } catch (error) {
    console.error("[POST /api/auth/verify-email]", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}