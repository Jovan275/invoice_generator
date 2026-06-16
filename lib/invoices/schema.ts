import { z } from "zod"

import { CURRENCIES } from "@/lib/money"
import type { InvoiceUnitType } from "@/lib/database.types"

function numericField(message: string) {
  return z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === "string" ? Number(value) : value))
    .pipe(z.number({ message }))
}

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required."),
  quantity: numericField("Quantity must be a number.").pipe(
    z.number().positive("Quantity must be greater than 0.")
  ),
  unit_type: z.enum(["hours", "flat"] satisfies [InvoiceUnitType, InvoiceUnitType]),
  unit_price: numericField("Price must be a number.").pipe(
    z.number().min(0, "Price must be 0 or greater.")
  ),
  vat_rate: numericField("VAT must be a number.").pipe(
    z.number().min(0, "VAT must be 0 or greater.").max(100, "VAT cannot exceed 100%.")
  ),
})

export const invoiceFormSchema = z
  .object({
    client_id: z.string().uuid("Select a client."),
    invoice_date: z.string().min(1, "Invoice date is required."),
    due_date: z.string().min(1, "Due date is required."),
    currency: z.enum(CURRENCIES),
    comments: z.string().trim(),
    line_items: z.array(lineItemSchema).min(1, "Add at least one line item."),
  })
  .refine((data) => data.due_date >= data.invoice_date, {
    message: "Due date must be on or after the invoice date.",
    path: ["due_date"],
  })
  .refine(
    (data) => {
      const subtotal = data.line_items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      )
      const tax = data.line_items.reduce((sum, item) => {
        const lineSubtotal = item.quantity * item.unit_price
        return sum + lineSubtotal * (item.vat_rate / 100)
      }, 0)
      return subtotal + tax > 0
    },
    {
      message: "Invoice total must be greater than 0.",
      path: ["line_items"],
    }
  )

export type LineItemFormValues = z.output<typeof lineItemSchema>
export type InvoiceFormInput = z.input<typeof invoiceFormSchema>
export type InvoiceFormValues = z.output<typeof invoiceFormSchema>

export const sendInvoiceSchema = z.object({
  recipient_email: z
    .string()
    .trim()
    .min(1, "Recipient email is required.")
    .email("Enter a valid email address."),
  message_html: z.string().trim().min(1, "Message is required."),
})

export type SendInvoiceFormValues = z.infer<typeof sendInvoiceSchema>

export function defaultLineItem(): LineItemFormValues {
  return {
    description: "",
    quantity: 1,
    unit_type: "flat",
    unit_price: 0,
    vat_rate: 0,
  }
}
