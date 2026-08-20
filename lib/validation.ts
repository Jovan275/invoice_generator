import { z } from "zod"

export const noCrlfPattern = /^[^\r\n]*$/

export function optionalTextField(maxLength: number) {
  return z
    .string()
    .max(maxLength, `Must be ${maxLength} characters or fewer.`)
    .optional()
    .or(z.literal(""))
}

export function noCrlfOptionalTextField(maxLength: number) {
  return optionalTextField(maxLength).refine(
    (value) => !value?.trim() || noCrlfPattern.test(value),
    { message: "This field contains invalid characters." }
  )
}

export function getFirstError(error: z.ZodError, fallback = "Invalid input."): string {
  return error.issues[0]?.message ?? fallback
}
