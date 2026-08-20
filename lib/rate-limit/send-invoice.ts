import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export type SendInvoiceRateLimitResult =
  | { allowed: true }
  | { allowed: false; error: string }

const DEFAULT_LIMIT = 20

function getConfiguredLimit(): number {
  const raw = process.env.SEND_INVOICE_RATE_LIMIT

  if (!raw) {
    return DEFAULT_LIMIT
  }

  const parsed = Number.parseInt(raw, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT
  }

  return parsed
}

function createRateLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(getConfiguredLimit(), "1 h"),
    prefix: "ratelimit:send-invoice",
  })
}

export async function checkSendInvoiceRateLimit(
  userId: string
): Promise<SendInvoiceRateLimitResult> {
  const ratelimit = createRateLimiter()

  if (!ratelimit) {
    return {
      allowed: false,
      error:
        "Invoice email sending is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    }
  }

  const { success } = await ratelimit.limit(userId)

  if (!success) {
    return {
      allowed: false,
      error:
        "You have reached the hourly limit for sending invoices. Please try again later.",
    }
  }

  return { allowed: true }
}
