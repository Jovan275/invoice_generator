import { describe, expect, it } from "vitest"

import { sanitizeRedirectPath } from "@/lib/auth/redirect"

describe("sanitizeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard")
    expect(sanitizeRedirectPath("/invoices/abc")).toBe("/invoices/abc")
    expect(sanitizeRedirectPath("/reset-password")).toBe("/reset-password")
  })

  it("rejects protocol-relative and absolute URLs", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard")
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard")
    expect(sanitizeRedirectPath("http://evil.com/path")).toBe("/dashboard")
  })

  it("rejects empty and null values", () => {
    expect(sanitizeRedirectPath(null)).toBe("/dashboard")
    expect(sanitizeRedirectPath(undefined)).toBe("/dashboard")
    expect(sanitizeRedirectPath("")).toBe("/dashboard")
  })

  it("uses a custom fallback", () => {
    expect(sanitizeRedirectPath(null, "/login")).toBe("/login")
    expect(sanitizeRedirectPath("//evil.com", "/login")).toBe("/login")
  })
})
