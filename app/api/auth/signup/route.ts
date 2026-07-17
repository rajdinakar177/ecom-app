import { NextRequest } from "next/server";
import bcrypt from "bcrypt";

import { connectDB } from "@/app/lib/db/mongoose";
import User from "@/app/models/User";
import { generateSecureToken, tokenExpiry } from "@/app/lib/auth/tokens";
import { sendVerificationEmail } from "@/app/lib/email/mailer";
import { apiSuccess, apiError } from "@/app/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { firstName, lastName, email, password } = body;

    // --- Input validation ---
    if (!firstName || !lastName || !email || !password) {
      return apiError("All fields are required.", 400);
    }

    if (password.length < 8) {
      return apiError("Password must be at least 8 characters.", 400);
    }

    // --- Duplicate check ---
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return apiError("An account with this email already exists.", 409);
    }

    // --- Hash password ---
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- Generate email verification token ---
    // rawToken → emailed to the user
    // hashedToken → stored in DB (safe if DB is compromised)
    const { rawToken, hashedToken } = generateSecureToken();

    // --- Create user ---
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      verifyToken: hashedToken,
      verifyTokenExpiry: tokenExpiry(24 * 60), // 24 hours
    });

    // --- Send verification email ---
    await sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      token: rawToken, // Send the RAW token in the URL, never the hash
    });

    return apiSuccess(
      { userId: user._id.toString() },
      "Account created. Please check your email to verify your account.",
      201
    );
  } catch (error) {
    console.error("[POST /api/auth/signup]", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}