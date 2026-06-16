import Link from "next/link"

import { InvoiceForm } from "@/components/invoices/invoice-form"
import { Button } from "@/components/ui/button"
import { getAllClientsForSelect } from "@/lib/clients/queries"
import { requireAuth } from "@/lib/auth/session"
import { getProfile } from "@/lib/profile/queries"
import type { PartySnapshot } from "@/lib/invoice"

export default async function NewInvoicePage() {
  const user = await requireAuth()
  const [clients, profile] = await Promise.all([
    getAllClientsForSelect(),
    getProfile(user.id),
  ])

  const senderSnapshot: PartySnapshot = {
    full_name: profile?.full_name ?? null,
    company_name: profile?.company_name ?? null,
    email: profile?.email?.trim() || user.email || null,
    address: profile?.address ?? null,
    vat_id: profile?.vat_id ?? null,
    website: profile?.website ?? null,
  }

  if (clients.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">New invoice</h1>
        <p className="text-muted-foreground">
          Add a client before creating an invoice.
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
        <h1 className="text-3xl font-semibold tracking-tight">New invoice</h1>
        <p className="mt-2 text-muted-foreground">
          Fill in the details below. The invoice number is assigned when you
          save.
        </p>
      </div>

      <InvoiceForm
        mode="create"
        clients={clients}
        senderSnapshot={senderSnapshot}
      />
    </div>
  )
}
