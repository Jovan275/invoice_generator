import "server-only"

import { renderToBuffer } from "@react-pdf/renderer"
import type { cookies } from "next/headers"

import { InvoicePdfDocument } from "@/components/pdf/invoice-document"
import type { InvoiceDetail } from "@/lib/invoices/types"
import { createClient } from "@/utils/supabase/server"

export function getInvoiceStoragePath(userId: string, invoiceId: string) {
  return `${userId}/${invoiceId}.pdf`
}

export async function generateInvoicePdfBuffer(invoice: InvoiceDetail) {
  return renderToBuffer(
    <InvoicePdfDocument
      invoiceNumber={invoice.invoice_number}
      invoiceDate={invoice.invoice_date}
      dueDate={invoice.due_date}
      currency={invoice.currency}
      sender={invoice.sender_snapshot}
      client={invoice.client_snapshot}
      items={invoice.items}
      subtotal={invoice.subtotal}
      tax={invoice.tax}
      total={invoice.total}
      comments={invoice.comments}
    />
  )
}

export async function uploadInvoicePdf(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  userId: string,
  invoiceId: string,
  pdfBuffer: Buffer
) {
  const supabase = createClient(cookieStore)
  const storagePath = getInvoiceStoragePath(userId, invoiceId)

  const { error } = await supabase.storage
    .from("invoices")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  return storagePath
}

export async function deleteInvoicePdf(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  storagePath: string
) {
  const supabase = createClient(cookieStore)

  const { error } = await supabase.storage.from("invoices").remove([storagePath])

  if (error) {
    throw new Error(error.message)
  }
}

export async function downloadInvoicePdfBytes(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  storagePath: string
) {
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.storage
    .from("invoices")
    .download(storagePath)

  if (error || !data) {
    throw new Error(error?.message ?? "Could not download PDF.")
  }

  return Buffer.from(await data.arrayBuffer())
}
