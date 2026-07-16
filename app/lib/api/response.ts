import { NextResponse } from "next/server";

/**
 * API Response Utility
 *
 * Every API route returns the same envelope shape:
 *   { success: boolean, message: string, data?: T, errors?: E }
 *
 * Centralising this means:
 * - The frontend always knows what shape to expect.
 * - We change the response structure in one place, not across 30 route files.
 * - RTK Query transformResponse functions stay simple.
 */

type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: Record<string, string> | string[];
};

/**
 * Returns a 2xx JSON response.
 *
 * @example
 * return apiSuccess({ user }, "Login successful");
 * // → { success: true, message: "Login successful", data: { user } }
 */
export function apiSuccess<T>(
  data: T,
  message = "Success",
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, message, data }, { status });
}

/**
 * Returns a 4xx/5xx JSON response.
 *
 * @example
 * return apiError("Email already in use", 409);
 */
export function apiError(
  message: string,
  status = 500,
  errors?: Record<string, string> | string[]
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false, message, errors }, { status });
}