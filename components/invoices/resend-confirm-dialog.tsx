"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { SendInvoiceDialog } from "@/components/invoices/send-invoice-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ResendConfirmDialogProps = {
  invoiceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResendConfirmDialog({
  invoiceId,
  open,
  onOpenChange,
}: ResendConfirmDialogProps) {
  const router = useRouter()
  const [showSendDialog, setShowSendDialog] = useState(false)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend to client?</DialogTitle>
            <DialogDescription>
              This invoice was previously sent. Would you like to resend it now
              with the updated details?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                router.push(`/invoices/${invoiceId}`)
                router.refresh()
              }}
            >
              Not now
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false)
                setShowSendDialog(true)
              }}
            >
              Resend to client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SendInvoiceDialog
        invoiceId={invoiceId}
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
      />
    </>
  )
}
