import { roundMoney } from "@/lib/money"
import type { InvoiceUnitType } from "@/lib/database.types"

export type LineItemInput = {
  description: string
  quantity: number
  unit_type: InvoiceUnitType
  unit_price: number
  vat_rate: number
}

export type InvoiceTotals = {
  subtotal: number
  tax: number
  total: number
}

export function calculateLineAmounts(item: LineItemInput) {
  const lineSubtotal = roundMoney(item.quantity * item.unit_price)
  const lineTax = roundMoney(lineSubtotal * (item.vat_rate / 100))
  const lineTotal = roundMoney(lineSubtotal + lineTax)

  return { lineSubtotal, lineTax, lineTotal }
}

export function calculateInvoiceTotals(items: LineItemInput[]): InvoiceTotals {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  )
  const tax = roundMoney(
    items.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unit_price
      return sum + lineSubtotal * (item.vat_rate / 100)
    }, 0)
  )
  const total = roundMoney(subtotal + tax)

  return { subtotal, tax, total }
}

export type PartySnapshot = {
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  website?: string | null
}

export function formatPartyName(party: PartySnapshot): string {
  const company = party.company_name?.trim()
  const name = party.full_name?.trim()

  if (company && name) {
    return `${company} (${name})`
  }

  return company || name || "—"
}

export function formatPartyLines(party: PartySnapshot): string[] {
  const lines: string[] = []

  if (party.company_name?.trim()) {
    lines.push(party.company_name.trim())
  }

  if (party.full_name?.trim()) {
    lines.push(party.full_name.trim())
  }

  if (party.email?.trim()) {
    lines.push(party.email.trim())
  }

  if (party.address?.trim()) {
    lines.push(party.address.trim())
  }

  if (party.vat_id?.trim()) {
    lines.push(`VAT: ${party.vat_id.trim()}`)
  }

  if (party.website?.trim()) {
    lines.push(party.website.trim())
  }

  return lines.length > 0 ? lines : ["—"]
}

export function getSenderDisplayName(sender: PartySnapshot): string {
  return (
    sender.company_name?.trim() ||
    sender.full_name?.trim() ||
    "Invoice Generator"
  )
}

export function buildEmailSubject(
  invoiceNumber: string,
  sender: PartySnapshot
): string {
  return `Invoice ${invoiceNumber} from ${getSenderDisplayName(sender)}`
}

export function defaultDueDate(from = new Date()): string {
  const date = new Date(from)
  date.setDate(date.getDate() + 14)
  return date.toISOString().slice(0, 10)
}

export function todayIsoDate(from = new Date()): string {
  return from.toISOString().slice(0, 10)
}

export function defaultEmailBody(invoiceNumber: string, totalFormatted: string) {
  return `<p>Please find attached invoice <strong>${invoiceNumber}</strong> for <strong>${totalFormatted}</strong>.</p>
<p>You can pay online using the link below:</p>
<p>{{PAYMENT_LINK}}</p>
<p>Thank you for your business.</p>`
}
