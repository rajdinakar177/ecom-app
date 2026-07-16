import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, JWTPayload } from "./tokens";
import { apiError } from "@/app/lib/api/response";

/**
 * Authenticated Request — extends NextRequest with the decoded JWT payload.
 * Route handlers wrapped with withAuth receive this type.
 */
export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

type RouteHandler = (
  req: AuthenticatedRequest,
  context: { params: Record<string, string> }
) => Promise<NextResponse>;


/**
 * withAuth — Higher-Order Function for protected route handlers.
 *
 * Reads the access token from the `token` httpOnly cookie, verifies it,
 * and attaches the decoded payload to `req.user` before calling the handler.
 *
 * Usage:
 *   export const GET = withAuth(async (req) => {
 *     const { id, role } = req.user;
 *     ...
 *   });
 *
 * Why a HOF instead of middleware?
 *   Next.js middleware runs at the edge (no DB, no Mongoose).
 *   Route-level HOFs run in the Node.js runtime and can access the DB,
 *   making them suitable for fine-grained permission checks.
 */
export function withAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context: { params: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      const token = req.cookies.get("token")?.value;

      if (!token) {
        return apiError("Authentication required. Please log in.", 401);
      }

      const decoded = verifyAccessToken(token);

      // Attach user payload to the request object.
      // We cast here because NextRequest doesn't natively have a `user` field.
      (req as AuthenticatedRequest).user = decoded;

      return handler(req as AuthenticatedRequest, context);
    } catch (error: unknown) {
      const isJWTError =
        error instanceof Error &&
        (error.name === "JsonWebTokenError" ||
          error.name === "TokenExpiredError");

      if (isJWTError && error.name === "TokenExpiredError") {
        return apiError("Session expired. Please log in again.", 401);
      }

      if (isJWTError) {
        return apiError("Invalid token. Please log in again.", 401);
      }

      console.error("[withAuth] Unexpected error:", error);
      return apiError("Authentication failed.", 500);
    }
  };
}

/**
 * withAdmin — Extends withAuth with an admin role check.
 *
 * Usage:
 *   export const DELETE = withAdmin(async (req) => {
 *     // Only admins reach here
 *   });
 */
export function withAdmin(handler: RouteHandler) {
  return withAuth(async (req: AuthenticatedRequest, context) => {
    if (req.user.role !== "admin") {
      return apiError(
        "Access denied. Admin privileges required.",
        403
      );
    }
    return handler(req, context);
  });
}