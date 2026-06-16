"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteInvoice } from "@/app/(app)/invoices/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { formatPartyName } from "@/lib/invoice"
import { formatMoney } from "@/lib/money"
import type { InvoiceDetail } from "@/lib/invoices/types"

type DeleteInvoiceDialogProps = {
  invoice: Pick<
    InvoiceDetail,
    "id" | "invoice_number" | "client_snapshot" | "total" | "currency"
  >
}

export function DeleteInvoiceDialog({ invoice }: DeleteInvoiceDialogProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    setIsPending(true)

    const result = await deleteInvoice(invoice.id)

    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Invoice deleted.")
    setOpen(false)
    router.push("/invoices")
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This permanently removes the invoice, its PDF, and payment link.</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>{invoice.invoice_number}</strong>
                </li>
                <li>{formatPartyName(invoice.client_snapshot)}</li>
                <li>{formatMoney(invoice.total, invoice.currency)}</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "Deleting..." : "Delete invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
