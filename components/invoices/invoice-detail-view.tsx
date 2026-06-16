"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { markInvoicePaid } from "@/app/(app)/invoices/actions"
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import { SendInvoiceDialog } from "@/components/invoices/send-invoice-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPartyLines, formatPartyName } from "@/lib/invoice"
import { formatMoney } from "@/lib/money"
import type { InvoiceDetail } from "@/lib/invoices/types"

type InvoiceDetailViewProps = {
  invoice: InvoiceDetail
  pdfUrl: string | null
  chargesEnabled: boolean
}

export function InvoiceDetailView({
  invoice,
  pdfUrl,
  chargesEnabled,
}: InvoiceDetailViewProps) {
  const router = useRouter()
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const isPaid = invoice.status === "paid"

  async function handleMarkPaid() {
    setIsMarkingPaid(true)
    const result = await markInvoicePaid(invoice.id)
    setIsMarkingPaid(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Invoice marked as paid.")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {invoice.invoice_number}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-2 text-muted-foreground">
            {formatPartyName(invoice.client_snapshot)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isPaid ? (
            <>
              <Button onClick={() => setShowSendDialog(true)} disabled={!chargesEnabled}>
                {invoice.last_sent_at ? "Resend to client" : "Send to client"}
              </Button>
              {!chargesEnabled ? (
                <Button asChild variant="outline">
                  <Link href="/settings/profile">Complete payment setup</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
              </Button>
              <Button
                variant="outline"
                disabled={isMarkingPaid}
                onClick={() => void handleMarkPaid()}
              >
                {isMarkingPaid ? "Updating..." : "Mark paid"}
              </Button>
              <DeleteInvoiceDialog invoice={invoice} />
            </>
          ) : null}
          {pdfUrl ? (
            <Button asChild variant="outline">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {!chargesEnabled && !isPaid ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete Stripe payment onboarding in Settings before you can send
          this invoice.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">From</h2>
          <div className="mt-2 text-sm text-muted-foreground">
            {formatPartyLines(invoice.sender_snapshot).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">To</h2>
          <div className="mt-2 text-sm text-muted-foreground">
            {formatPartyLines(invoice.client_snapshot).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm font-medium">Invoice date</p>
          <p className="text-sm text-muted-foreground">{invoice.invoice_date}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Due date</p>
          <p className="text-sm text-muted-foreground">{invoice.due_date}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Last sent</p>
          <p className="text-sm text-muted-foreground">
            {invoice.last_sent_at
              ? new Date(invoice.last_sent_at).toLocaleString()
              : "Not sent yet"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>VAT</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>
                  {item.unit_type === "hours" ? "hours" : "flat"}
                </TableCell>
                <TableCell>
                  {formatMoney(item.unit_price, invoice.currency)}
                </TableCell>
                <TableCell>{item.vat_rate}%</TableCell>
                <TableCell className="text-right">
                  {formatMoney(item.line_total ?? 0, invoice.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          {invoice.comments?.trim() ? (
            <>
              <h2 className="text-sm font-medium">Comments</h2>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {invoice.comments}
              </p>
            </>
          ) : null}
        </div>

        <div className="w-full max-w-xs space-y-2 rounded-lg border bg-muted/30 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatMoney(invoice.tax, invoice.currency)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatMoney(invoice.total, invoice.currency)}</span>
          </div>
        </div>
      </div>

      {!isPaid && invoice.stripe_payment_link_url ? (
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">Payment link</h2>
          <a
            href={invoice.stripe_payment_link_url}
            className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {invoice.stripe_payment_link_url}
          </a>
        </div>
      ) : null}

      <SendInvoiceDialog
        invoiceId={invoice.id}
        defaultRecipientEmail={
          invoice.client_snapshot.email?.trim() ?? ""
        }
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
      />
    </div>
  )
}
