import "server-only"

import { toStripeAmount } from "@/lib/money"
import { getAppUrl, getStripeClient } from "@/utils/stripe/client"

type CreateCheckoutParams = {
  invoiceId: string
  invoiceNumber: string
  total: number
  currency: string
  stripeAccountId: string
}

export async function createInvoiceCheckoutSession({
  invoiceId,
  invoiceNumber,
  total,
  currency,
  stripeAccountId,
}: CreateCheckoutParams) {
  const stripe = getStripeClient()
  const appUrl = getAppUrl()

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: toStripeAmount(total, currency),
            product_data: {
              name: `Invoice ${invoiceNumber}`,
            },
          },
        },
      ],
      success_url: `${appUrl}/invoices/${invoiceId}?paid=1`,
      cancel_url: `${appUrl}/invoices/${invoiceId}`,
      metadata: {
        invoice_id: invoiceId,
      },
    },
    {
      stripeAccount: stripeAccountId,
    }
  )

  return session
}
