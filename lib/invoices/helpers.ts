import "server-only"

import { cookies } from "next/headers"

import type { PartySnapshot } from "@/lib/invoice"
import type { ClientListItem } from "@/lib/clients/types"
import type { ProfileSenderDetails } from "@/lib/profile/types"
import type { InvoiceDetail } from "@/lib/invoices/types"
import { createInvoiceCheckoutSession } from "@/utils/stripe/checkout"
import { expireCheckoutSession } from "@/utils/stripe/connect"
import { createClient } from "@/utils/supabase/server"

export function toSenderSnapshot(profile: ProfileSenderDetails): PartySnapshot {
  return {
    full_name: profile.full_name,
    company_name: profile.company_name,
    email: profile.email,
    address: profile.address,
    vat_id: profile.vat_id,
    website: profile.website,
  }
}

export function toClientSnapshot(client: ClientListItem): PartySnapshot {
  return {
    full_name: client.full_name,
    company_name: client.company_name,
    email: client.email,
    address: client.address,
    vat_id: client.vat_id,
  }
}

export async function syncInvoicePaymentLink(
  invoice: InvoiceDetail,
  profile: ProfileSenderDetails
) {
  if (!profile.charges_enabled || !profile.stripe_account_id) {
    return null
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  if (invoice.stripe_checkout_session_id) {
    await expireCheckoutSession(
      invoice.stripe_checkout_session_id,
      profile.stripe_account_id
    )
  }

  const session = await createInvoiceCheckoutSession({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    total: invoice.total,
    currency: invoice.currency,
    stripeAccountId: profile.stripe_account_id,
  })

  const { error } = await supabase
    .from("invoices")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_payment_link_url: session.url,
      stripe_payment_status: session.status,
    })
    .eq("id", invoice.id)

  if (error) {
    throw new Error(error.message)
  }

  return session.url
}

export async function deactivateInvoicePaymentLink(
  invoice: Pick<
    InvoiceDetail,
    "id" | "stripe_checkout_session_id"
  >,
  stripeAccountId: string | null
) {
  if (!invoice.stripe_checkout_session_id || !stripeAccountId) {
    return
  }

  await expireCheckoutSession(
    invoice.stripe_checkout_session_id,
    stripeAccountId
  )

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  await supabase
    .from("invoices")
    .update({
      stripe_payment_link_url: null,
      stripe_payment_status: "expired",
    })
    .eq("id", invoice.id)
}

export function getReplyToEmail(
  profile: ProfileSenderDetails | null,
  authEmail: string
) {
  return profile?.email?.trim() || authEmail
}
