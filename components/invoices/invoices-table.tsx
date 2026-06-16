"use client"

import Link from "next/link"
import { useState } from "react"

import { SendInvoiceDialog } from "@/components/invoices/send-invoice-dialog"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPartyName } from "@/lib/invoice"
import { formatMoney } from "@/lib/money"
import type { InvoiceListItem } from "@/lib/invoices/types"

type InvoicesTableProps = {
  invoices: InvoiceListItem[]
  pdfUrls: Record<string, string | null>
}

export function InvoicesTable({ invoices, pdfUrls }: InvoicesTableProps) {
  const [sendInvoiceId, setSendInvoiceId] = useState<string | null>(null)
  const sendingInvoice = invoices.find((invoice) => invoice.id === sendInvoiceId)

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Invoice date</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="hover:underline"
                  >
                    {invoice.invoice_number}
                  </Link>
                </TableCell>
                <TableCell>{formatPartyName(invoice.client_snapshot)}</TableCell>
                <TableCell>{invoice.invoice_date}</TableCell>
                <TableCell>{invoice.due_date}</TableCell>
                <TableCell>
                  {formatMoney(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/invoices/${invoice.id}`}>View</Link>
                    </Button>
                    {invoice.status === "not_paid" ? (
                      <>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSendInvoiceId(invoice.id)}
                        >
                          {invoice.last_sent_at ? "Resend" : "Send"}
                        </Button>
                      </>
                    ) : null}
                    {pdfUrls[invoice.id] ? (
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={pdfUrls[invoice.id]!}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {sendInvoiceId && sendingInvoice ? (
        <SendInvoiceDialog
          invoiceId={sendInvoiceId}
          defaultRecipientEmail={
            sendingInvoice.client_snapshot.email?.trim() ?? ""
          }
          open={Boolean(sendInvoiceId)}
          onOpenChange={(open) => {
            if (!open) {
              setSendInvoiceId(null)
            }
          }}
        />
      ) : null}
    </>
  )
}
