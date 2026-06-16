import { notFound } from "next/navigation"

import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view"
import { requireAuth } from "@/lib/auth/session"
import {
  getInvoice,
  getInvoicePdfSignedUrl,
} from "@/lib/invoices/queries"
import { getProfile } from "@/lib/profile/queries"

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const user = await requireAuth()
  const { id } = await params

  const [invoice, profile] = await Promise.all([
    getInvoice(id),
    getProfile(user.id),
  ])

  if (!invoice) {
    notFound()
  }

  const pdfUrl = invoice.pdf_storage_path
    ? await getInvoicePdfSignedUrl(invoice.pdf_storage_path)
    : null

  return (
    <InvoiceDetailView
      invoice={invoice}
      pdfUrl={pdfUrl}
      chargesEnabled={Boolean(profile?.charges_enabled)}
    />
  )
}
