import { z } from "zod"

function optionalTextField(maxLength: number) {
  return z
    .string()
    .max(maxLength, `Must be ${maxLength} characters or fewer.`)
    .optional()
    .or(z.literal(""))
}

const vatIdPattern = /^[A-Za-z0-9.\-/\s]+$/

export const clientFormSchema = z
  .object({
    full_name: optionalTextField(200),
    company_name: optionalTextField(200),
    email: z
      .string()
      .min(1, "Email is required.")
      .email("Please enter a valid email address."),
    address: optionalTextField(2000),
    vat_id: optionalTextField(100).refine(
      (value) => !value?.trim() || vatIdPattern.test(value.trim()),
      {
        message:
          "VAT ID may only contain letters, numbers, and common separators.",
      }
    ),
  })
  .superRefine((values, ctx) => {
    const hasName = Boolean(values.full_name?.trim())
    const hasCompany = Boolean(values.company_name?.trim())

    if (!hasName && !hasCompany) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a full name or company name.",
        path: ["full_name"],
      })
    }
  })

export type ClientFormValues = z.infer<typeof clientFormSchema>

export function normalizeClientFormValues(values: ClientFormValues) {
  const trimOrNull = (value: string | undefined) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
  }

  return {
    full_name: trimOrNull(values.full_name),
    company_name: trimOrNull(values.company_name),
    email: values.email.trim().toLowerCase(),
    address: trimOrNull(values.address),
    vat_id: trimOrNull(values.vat_id),
  }
}
