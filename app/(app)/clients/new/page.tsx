import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ClientForm } from "@/components/clients/client-form"
import { requireAuth } from "@/lib/auth/session"

export default async function NewClientPage() {
  await requireAuth()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Add client</h1>
        <p className="mt-2 text-muted-foreground">
          Save client details to use on future invoices.
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
          <ClientForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
