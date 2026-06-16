import { cookies } from "next/headers"

import type { InvoiceDetail, InvoiceListItem } from "@/lib/invoices/types"
import { parsePartySnapshot, INVOICES_PAGE_SIZE } from "@/lib/invoices/types"
import { createClient } from "@/utils/supabase/server"

const invoiceListSelect =
  "id, invoice_number, client_snapshot, invoice_date, due_date, currency, total, status, last_sent_at, pdf_storage_path" as const

const invoiceDetailSelect =
  "id, invoice_number, client_id, sender_snapshot, client_snapshot, invoice_date, due_date, currency, status, subtotal, tax, total, comments, stripe_checkout_session_id, stripe_payment_link_url, pdf_storage_path, last_sent_at, created_at, updated_at" as const

type GetInvoicesParams = {
  page?: number
  pageSize?: number
  status?: "paid" | "not_paid" | "all"
}

export async function getInvoices({
  page = 1,
  pageSize = INVOICES_PAGE_SIZE,
  status = "all",
}: GetInvoicesParams = {}): Promise<InvoiceListItem[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("invoices")
    .select(invoiceListSelect)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    ...row,
    client_snapshot: parsePartySnapshot(row.client_snapshot),
  }))
}

export async function getInvoicesCount(
  status: "paid" | "not_paid" | "all" = "all"
): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let query = supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })

  if (status !== "all") {
    query = query.eq("status", status)
  }

  const { count, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceDetailSelect)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select(
      "id, description, quantity, unit_type, unit_price, vat_rate, line_subtotal, line_tax, line_total, position"
    )
    .eq("invoice_id", id)
    .order("position", { ascending: true })

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return {
    ...data,
    sender_snapshot: parsePartySnapshot(data.sender_snapshot),
    client_snapshot: parsePartySnapshot(data.client_snapshot),
    items: items ?? [],
  }
}

export async function getDashboardStats() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("invoices")
    .select("status, total, currency")

  if (error) {
    throw new Error(error.message)
  }

  const rows = data ?? []
  const outstanding = rows.filter((row) => row.status === "not_paid")
  const paid = rows.filter((row) => row.status === "paid")

  const sumTotals = (items: typeof rows) =>
    items.reduce((sum, row) => sum + Number(row.total), 0)

  return {
    totalOutstanding: sumTotals(outstanding),
    totalPaid: sumTotals(paid),
    outstandingCount: outstanding.length,
    paidCount: paid.length,
    invoiceCount: rows.length,
  }
}

export async function getRecentInvoices(limit = 5): Promise<InvoiceListItem[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceListSelect)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    ...row,
    client_snapshot: parsePartySnapshot(row.client_snapshot),
  }))
}

export async function getInvoicePdfSignedUrl(
  storagePath: string
): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.storage
    .from("invoices")
    .createSignedUrl(storagePath, 60 * 10)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}
