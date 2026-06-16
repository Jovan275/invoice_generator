export const CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "JPY",
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
  CHF: "de-CH",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatMoney(amount: number, currency: string): string {
  const code = (CURRENCIES.includes(currency as CurrencyCode)
    ? currency
    : "EUR") as CurrencyCode
  const locale = CURRENCY_LOCALE[code]

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: code === "JPY" ? 0 : 2,
    maximumFractionDigits: code === "JPY" ? 0 : 2,
  }).format(amount)
}

export function toStripeAmount(total: number, currency: string): number {
  if (currency === "JPY") {
    return Math.round(total)
  }

  return Math.round(total * 100)
}
