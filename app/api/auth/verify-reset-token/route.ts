import { NextRequest } from "next/server";
import { connectDB } from "@/app/lib/db/mongoose";
import User from "@/app/models/User";
import { hashToken } from "@/app/lib/auth/tokens";
import { apiSuccess, apiError } from "@/app/lib/api/response";

/**
 * POST /api/auth/verify-reset-token
 *
 * Called by the frontend when a user lands on the reset-password page.
 * Validates the token BEFORE showing the form — no point asking the user
 * to enter a new password if the link is already expired.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return apiError("Token is required.", 400);
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordTokenExpiry: { $gt: new Date() },
    }).select("+forgotPasswordToken +forgotPasswordTokenExpiry");

    if (!user) {
      return apiError(
        "This reset link is invalid or has expired. Please request a new one.",
        400
      );
    }

    // Token is valid — frontend can now show the reset form.
    // We return the user's first name so the UI can personalise the page.
    return apiSuccess(
      { firstName: user.firstName },
      "Token is valid."
    );
  } catch (error) {
    console.error("[POST /api/auth/verify-reset-token]", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}