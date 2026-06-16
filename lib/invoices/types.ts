import type { Json } from "@/lib/database.types"
import type { InvoiceStatus } from "@/lib/database.types"
import type { PartySnapshot } from "@/lib/invoice"
import type { LineItemFormValues } from "@/lib/invoices/schema"
import type { CurrencyCode } from "@/lib/money"
import { defaultDueDate, todayIsoDate } from "@/lib/invoice"

export type InvoiceListItem = {
  id: string
  invoice_number: string
  client_snapshot: PartySnapshot
  invoice_date: string
  due_date: string
  currency: string
  total: number
  status: InvoiceStatus
  last_sent_at: string | null
  pdf_storage_path: string | null
}

export type InvoiceItemRow = {
  id: string
  description: string
  quantity: number
  unit_type: "hours" | "flat"
  unit_price: number
  vat_rate: number
  line_subtotal: number | null
  line_tax: number | null
  line_total: number | null
  position: number
}

export type InvoiceDetail = InvoiceListItem & {
  client_id: string | null
  sender_snapshot: PartySnapshot
  subtotal: number
  tax: number
  comments: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_link_url: string | null
  pdf_storage_path: string | null
  created_at: string
  updated_at: string
  items: InvoiceItemRow[]
}

export function parsePartySnapshot(value: Json): PartySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      full_name: null,
      company_name: null,
      email: null,
      address: null,
      vat_id: null,
    }
  }

  const record = value as Record<string, unknown>

  return {
    full_name: typeof record.full_name === "string" ? record.full_name : null,
    company_name:
      typeof record.company_name === "string" ? record.company_name : null,
    email: typeof record.email === "string" ? record.email : null,
    address: typeof record.address === "string" ? record.address : null,
    vat_id: typeof record.vat_id === "string" ? record.vat_id : null,
    website: typeof record.website === "string" ? record.website : null,
  }
}

export function toInvoiceFormDefaults(invoice?: InvoiceDetail | null) {
  if (!invoice) {
    return {
      client_id: "",
      invoice_date: todayIsoDate(),
      due_date: defaultDueDate(),
      currency: "EUR" as const,
      comments: "",
      line_items: [
        {
          description: "",
          quantity: 1,
          unit_type: "flat" as const,
          unit_price: 0,
          vat_rate: 0,
        },
      ],
    }
  }

  return {
    client_id: invoice.client_id ?? "",
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    currency: invoice.currency as CurrencyCode,
    comments: invoice.comments ?? "",
    line_items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_type: item.unit_type,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
    })) satisfies LineItemFormValues[],
  }
}

export const INVOICES_PAGE_SIZE = 10
