import "server-only"

import { NextResponse } from "next/server"
import Stripe from "stripe"

import { createAdminClient } from "@/utils/supabase/admin"
import { getStripeClient } from "@/utils/stripe/client"
import { isChargesEnabled } from "@/utils/stripe/connect"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 }
    )
  }

  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 })
  }

  const body = await request.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const invoiceId = session.metadata?.invoice_id

    if (invoiceId) {
      await admin
        .from("invoices")
        .update({
          status: "paid",
          stripe_payment_status: session.payment_status,
          stripe_payment_link_url: null,
        })
        .eq("id", invoiceId)
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account

    await admin
      .from("profiles")
      .update({ charges_enabled: isChargesEnabled(account) })
      .eq("stripe_account_id", account.id)
  }

  return NextResponse.json({ received: true })
}
