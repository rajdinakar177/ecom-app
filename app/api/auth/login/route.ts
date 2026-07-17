import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { connectDB } from "@/app/lib/db/mongoose";
import User from "@/app/models/User";
import { signAccessToken, signRefreshToken } from "@/app/lib/auth/tokens";
import { apiSuccess, apiError } from "@/app/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, password } = body;

    // --- Input validation ---
    if (!email || !password) {
      return apiError("Email and password are required.", 400);
    }

    // --- Find user ---
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return apiError("Invalid email or password.", 401);
    }

    // --- Check password ---
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return apiError("Invalid email or password.", 401);
    }

    // --- Check email verification ---
    if (!user.isVerified) {
      return apiError(
        "Please verify your email address before logging in.",
        403
      );
    }

    // --- Sign tokens ---
    // Access token: short-lived (1h), sent in httpOnly cookie
    // Refresh token: long-lived (7d), sent in separate httpOnly cookie
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user._id.toString());

    // --- Build response ---
    const response = apiSuccess(
      {
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
        },
      },
      "Login successful."
    );

    // --- Set httpOnly cookies ---
    // httpOnly: JS cannot read these — mitigates XSS.
    // secure: only sent over HTTPS (enforced in production).
    // sameSite: "lax" protects against most CSRF without breaking OAuth flows.
    response.cookies.set("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour in seconds
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}