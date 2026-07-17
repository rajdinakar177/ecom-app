import crypto from "crypto";
import jwt from "jsonwebtoken";
import { IUser } from "@/app/models/User";

/**
 * Token Utilities
 *
 * Two categories of tokens live here:
 *
 * 1. SECURE RANDOM TOKENS  — for email verification & password reset.
 *    Pattern: generate raw → email raw → store SHA-256 hash → verify by hashing incoming.
 *    Why SHA-256 instead of bcrypt?
 *      - bcrypt is designed for passwords (slow by design, $-prefixed output).
 *      - These tokens are already high-entropy (256 bits), so slow hashing
 *        adds no security benefit and breaks URL safety.
 *      - SHA-256 is fast, URL-safe, and sufficient for single-use tokens.
 *
 * 2. JWT TOKENS — for session authentication.
 *    Payload carries only what's needed for RBAC; nothing sensitive.
 */

// ---------------------------------------------------------------------------
// 1. Secure Random Tokens
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically secure random token.
 * Returns the raw token (to be emailed) and its SHA-256 hash (to be stored).
 */
export function generateSecureToken(): {
  rawToken: string;
  hashedToken: string;
} {
  const rawToken = crypto.randomBytes(32).toString("hex"); // 64 hex chars, URL-safe
  const hashedToken = hashToken(rawToken);
  return { rawToken, hashedToken };
}

/**
 * Hashes a token with SHA-256.
 * Used both when storing and when verifying an incoming token.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Returns a Date object representing `minutes` from now.
 * Used to set token expiry times.
 */
export function tokenExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ---------------------------------------------------------------------------
// 2. JWT Tokens
// ---------------------------------------------------------------------------

export interface JWTPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT_SECRET and JWT_REFRESH_SECRET must be defined in environment variables"
  );
}

/**
 * Signs a short-lived access token (1 hour).
 * Payload contains only what's needed for auth decisions — no sensitive data.
 */
export function signAccessToken(user: IUser): string {
  const payload: JWTPayload = {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
  });
}

/**
 * Signs a long-lived refresh token (7 days).
 * Carries minimal payload — just enough to look up the user and re-issue
 * an access token. Stored in an httpOnly cookie.
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * Verifies an access token and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
}