import { afterEach, describe, expect, it, vi } from "vitest"

describe("checkSendInvoiceRateLimit", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("fails closed when Upstash env vars are missing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")

    const { checkSendInvoiceRateLimit } = await import(
      "@/lib/rate-limit/send-invoice"
    )

    const result = await checkSendInvoiceRateLimit("user-123")

    expect(result).toEqual({
      allowed: false,
      error:
        "Invoice email sending is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    })
  })

  it("allows requests when rate limiter returns success", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token")

    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow() {
          return {}
        }

        limit = vi.fn().mockResolvedValue({ success: true })
      },
    }))

    vi.doMock("@upstash/redis", () => ({
      Redis: class {},
    }))

    const { checkSendInvoiceRateLimit } = await import(
      "@/lib/rate-limit/send-invoice"
    )

    const result = await checkSendInvoiceRateLimit("user-123")

    expect(result).toEqual({ allowed: true })
  })

  it("blocks requests when rate limiter returns failure", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token")

    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow() {
          return {}
        }

        limit = vi.fn().mockResolvedValue({ success: false })
      },
    }))

    vi.doMock("@upstash/redis", () => ({
      Redis: class {},
    }))

    const { checkSendInvoiceRateLimit } = await import(
      "@/lib/rate-limit/send-invoice"
    )

    const result = await checkSendInvoiceRateLimit("user-123")

    expect(result).toEqual({
      allowed: false,
      error:
        "You have reached the hourly limit for sending invoices. Please try again later.",
    })
  })
})
