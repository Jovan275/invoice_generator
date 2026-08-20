import { z } from "zod"

export function optionalTextField(maxLength: number) {
  return z
    .string()
    .max(maxLength, `Must be ${maxLength} characters or fewer.`)
    .optional()
    .or(z.literal(""))
}

export function getFirstError(error: z.ZodError, fallback = "Invalid input."): string {
  return error.issues[0]?.message ?? fallback
}
