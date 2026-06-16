"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  getDefaultSendMessage,
  sendInvoice,
} from "@/app/(app)/invoices/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  sendInvoiceSchema,
  type SendInvoiceFormValues,
} from "@/lib/invoices/schema"

type SendInvoiceDialogProps = {
  invoiceId: string
  defaultRecipientEmail?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerLabel?: string
}

export function SendInvoiceDialog({
  invoiceId,
  defaultRecipientEmail = "",
  open,
  onOpenChange,
}: SendInvoiceDialogProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const form = useForm<SendInvoiceFormValues>({
    resolver: zodResolver(sendInvoiceSchema),
    defaultValues: {
      recipient_email: defaultRecipientEmail,
      message_html: "",
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    void getDefaultSendMessage(invoiceId).then((result) => {
      if (cancelled) {
        return
      }

      if ("message_html" in result && result.message_html) {
        form.reset({
          recipient_email:
            result.recipient_email || defaultRecipientEmail,
          message_html: result.message_html,
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, invoiceId, defaultRecipientEmail, form])

  async function onSubmit(values: SendInvoiceFormValues) {
    setIsPending(true)

    const result = await sendInvoice(invoiceId, values)

    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Invoice sent to client.")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send to client</DialogTitle>
          <DialogDescription>
            The PDF will be attached and a payment link included. You will
            receive a BCC copy.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipient_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="client@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message_html"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={8} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending..." : "Send invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
