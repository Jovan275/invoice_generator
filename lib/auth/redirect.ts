/**
 * Sanitizes post-auth redirect paths to prevent open redirects.
 * Only same-origin relative paths are allowed (must start with "/" but not "//").
 */
export function sanitizeRedirectPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback
  }

  return next
}
