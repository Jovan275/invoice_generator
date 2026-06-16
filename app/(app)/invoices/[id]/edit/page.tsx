import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { InvoiceForm } from "@/components/invoices/invoice-form"
import { Button } from "@/components/ui/button"
import { getAllClientsForSelect } from "@/lib/clients/queries"
import { requireAuth } from "@/lib/auth/session"
import { getInvoice } from "@/lib/invoices/queries"

type EditInvoicePageProps = {
  params: Promise<{ id: string }>
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  await requireAuth()
  const { id } = await params

  const [invoice, clients] = await Promise.all([
    getInvoice(id),
    getAllClientsForSelect(),
  ])

  if (!invoice) {
    notFound()
  }

  if (invoice.status === "paid") {
    redirect(`/invoices/${id}`)
  }

  if (clients.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Edit invoice</h1>
        <p className="text-muted-foreground">
          Add a client before editing this invoice.
        </p>
        <Button asChild>
          <Link href="/clients/new">Add client</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit invoice</h1>
        <p className="mt-2 text-muted-foreground">
          Update invoice details. The PDF and payment link refresh when you save.
        </p>
      </div>

      <InvoiceForm
        mode="edit"
        clients={clients}
        senderSnapshot={invoice.sender_snapshot}
        invoice={invoice}
      />
    </div>
  )
}
