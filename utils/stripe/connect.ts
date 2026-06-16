import "server-only"

import type Stripe from "stripe"

import { getAppUrl, getStripeClient } from "@/utils/stripe/client"

export async function createConnectAccount(email: string) {
  const stripe = getStripeClient()

  return stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })
}

export async function createAccountLink(
  accountId: string,
  type: "account_onboarding" | "account_update" = "account_onboarding"
) {
  const stripe = getStripeClient()
  const appUrl = getAppUrl()

  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/settings/profile?stripe=refresh`,
    return_url: `${appUrl}/settings/profile?stripe=return`,
    type,
  })
}

export async function retrieveConnectAccount(accountId: string) {
  const stripe = getStripeClient()
  return stripe.accounts.retrieve(accountId)
}

export function isChargesEnabled(account: Stripe.Account) {
  return Boolean(account.charges_enabled)
}

export async function expireCheckoutSession(
  sessionId: string,
  stripeAccountId: string
) {
  const stripe = getStripeClient()

  try {
    await stripe.checkout.sessions.expire(sessionId, {
      stripeAccount: stripeAccountId,
    })
  } catch {
    // Session may already be expired or completed.
  }
}
