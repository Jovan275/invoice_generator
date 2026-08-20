import { describe, expect, it } from "vitest"

import { sanitizeHeaderValue } from "@/lib/sanitize"

describe("sanitizeHeaderValue", () => {
  it("strips carriage return and newline characters", () => {
    expect(sanitizeHeaderValue("Invoice\r\nBcc: attacker@evil.com")).toBe(
      "InvoiceBcc: attacker@evil.com"
    )
    expect(sanitizeHeaderValue("hello\nworld")).toBe("helloworld")
    expect(sanitizeHeaderValue("hello\rworld")).toBe("helloworld")
  })

  it("leaves clean values unchanged", () => {
    expect(sanitizeHeaderValue("Invoice INV-2026-0001")).toBe(
      "Invoice INV-2026-0001"
    )
    expect(sanitizeHeaderValue("client@example.com")).toBe("client@example.com")
  })
})
