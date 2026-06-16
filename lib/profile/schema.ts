import { z } from "zod"

function optionalTextField(maxLength: number) {
  return z
    .string()
    .max(maxLength, `Must be ${maxLength} characters or fewer.`)
    .optional()
    .or(z.literal(""))
}

export const profileFormSchema = z.object({
  full_name: optionalTextField(200),
  company_name: optionalTextField(200),
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) =>
        !value?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
      { message: "Please enter a valid email address." }
    ),
  address: optionalTextField(2000),
  vat_id: optionalTextField(100),
  website: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => {
        if (!value?.trim()) {
          return true
        }

        try {
          new URL(value.trim())
          return true
        } catch {
          return false
        }
      },
      { message: "Please enter a valid website URL." }
    ),
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>

export function normalizeProfileFormValues(values: ProfileFormValues) {
  const trimOrNull = (value: string | undefined) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
  }

  return {
    full_name: trimOrNull(values.full_name),
    company_name: trimOrNull(values.company_name),
    email: trimOrNull(values.email),
    address: trimOrNull(values.address),
    vat_id: trimOrNull(values.vat_id),
    website: trimOrNull(values.website),
  }
}
