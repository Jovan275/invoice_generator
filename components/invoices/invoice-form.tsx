"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import {
  createInvoice,
  updateInvoice,
} from "@/app/(app)/invoices/actions"
import { InvoiceLineItems } from "@/components/invoices/invoice-line-items"
import { InvoiceTotals } from "@/components/invoices/invoice-totals"
import { ResendConfirmDialog } from "@/components/invoices/resend-confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatClientSelectLabel } from "@/lib/clients/display"
import type { ClientListItem } from "@/lib/clients/types"
import type { PartySnapshot } from "@/lib/invoice"
import { formatPartyLines } from "@/lib/invoice"
import { CURRENCIES } from "@/lib/money"
import {
  invoiceFormSchema,
  type InvoiceFormInput,
  type InvoiceFormValues,
} from "@/lib/invoices/schema"
import {
  toInvoiceFormDefaults,
  type InvoiceDetail,
} from "@/lib/invoices/types"

type InvoiceFormProps = {
  mode: "create" | "edit"
  clients: ClientListItem[]
  senderSnapshot: PartySnapshot
  invoice?: InvoiceDetail | null
}

export function InvoiceForm({
  mode,
  clients,
  senderSnapshot,
  invoice = null,
}: InvoiceFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [showResendDialog, setShowResendDialog] = useState(false)
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)

  const form = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: toInvoiceFormDefaults(invoice),
  })

  const lineItems = useWatch({ control: form.control, name: "line_items" })
  const currency = useWatch({ control: form.control, name: "currency" })
  const selectedClientId = useWatch({ control: form.control, name: "client_id" })

  const selectedClient = clients.find((client) => client.id === selectedClientId)

  async function saveInvoice(values: InvoiceFormValues) {
    setIsPending(true)

    const result =
      mode === "create"
        ? await createInvoice(values)
        : await updateInvoice(invoice!.id, values)

    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (mode === "create") {
      toast.success("Invoice created.")
      router.push(`/invoices/${result.id}`)
      router.refresh()
      return
    }

    toast.success("Invoice updated.")

    if (result.needsResend) {
      setSavedInvoiceId(result.id ?? invoice!.id)
      setShowResendDialog(true)
      router.refresh()
      return
    }

    router.push(`/invoices/${result.id ?? invoice!.id}`)
    router.refresh()
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(saveInvoice)} className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-4">
              <h3 className="text-sm font-medium">From</h3>
              <div className="text-sm text-muted-foreground">
                {formatPartyLines(senderSnapshot).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To (client)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {formatClientSelectLabel(client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClient ? (
                    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                      {formatPartyLines({
                        full_name: selectedClient.full_name,
                        company_name: selectedClient.company_name,
                        email: selectedClient.email,
                        address: selectedClient.address,
                        vat_id: selectedClient.vat_id,
                      }).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mode === "edit" && invoice ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Invoice number</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.invoice_number}
                </p>
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="invoice_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <InvoiceLineItems />

          <InvoiceTotals items={lineItems ?? []} currency={currency ?? "EUR"} />

          <FormField
            control={form.control}
            name="comments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comments</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional footer notes"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                router.push(
                  mode === "edit" && invoice
                    ? `/invoices/${invoice.id}`
                    : "/invoices"
                )
              }
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : mode === "create"
                  ? "Create invoice"
                  : "Save changes"}
            </Button>
          </div>
        </form>
      </Form>

      {savedInvoiceId ? (
        <ResendConfirmDialog
          open={showResendDialog}
          onOpenChange={setShowResendDialog}
          invoiceId={savedInvoiceId}
        />
      ) : null}
    </>
  )
}
