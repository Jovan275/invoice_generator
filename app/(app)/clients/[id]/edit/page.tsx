import { notFound } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ClientForm } from "@/components/clients/client-form"
import { requireAuth } from "@/lib/auth/session"
import { getClient } from "@/lib/clients/queries"

type EditClientPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  await requireAuth()

  const { id } = await params
  const client = await getClient(id)

  if (!client) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit client</h1>
        <p className="mt-2 text-muted-foreground">
          Changes apply to future invoices only. Existing invoices keep their
          saved client details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
          <CardDescription>
            Email is required, plus at least one of full name or company name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm mode="edit" client={client} />
        </CardContent>
      </Card>
    </div>
  )
}
