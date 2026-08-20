import xss, { type IFilterXSSOptions } from "xss"

const strictOptions: IFilterXSSOptions = {
  whiteList: {},
  stripIgnoreTag: true,
}

const emailHtmlOptions: IFilterXSSOptions = {
  whiteList: {
    a: ["href", "title", "target"],
    p: [],
    br: [],
    strong: [],
    em: [],
    ul: [],
    ol: [],
    li: [],
  },
  stripIgnoreTag: true,
}

export function sanitize(input: string): string {
  return xss(input, strictOptions).trim()
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function sanitizeHtmlEmail(input: string): string {
  return xss(input, emailHtmlOptions).trim()
}

/** Strips CR/LF from email header values to prevent header injection. */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, "")
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj } as Record<string, unknown>

  for (const key of Object.keys(result)) {
    const value = result[key]

    if (typeof value === "string") {
      result[key] = sanitize(value)
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string"
          ? sanitize(item)
          : item !== null && typeof item === "object"
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      )
    }
  }

  return result as T
}
