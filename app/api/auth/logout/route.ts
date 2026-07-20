import { NextRequest } from "next/server";
import { apiSuccess } from "@/app/lib/api/response";

/**
 * GET /api/auth/logout
 *
 * Clears both the access token and refresh token cookies.
 * No DB call needed — we just expire the cookies client-side.
 *
 * Note: For true token revocation (e.g. "log out all devices"),
 * we'd maintain a token denylist in Redis. That's a Phase 8 enhancement.
 */
export async function GET(_req: NextRequest) {          //"_req I know this parameter exists, but I'm intentionally not using it."
  const response = apiSuccess(null, "Logged out successfully.");

  // Clear access token
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  // Clear refresh token
  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}