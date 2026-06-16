"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { getProfile } from "@/lib/profile/queries"
import { createClient } from "@/utils/supabase/server"
import {
  createAccountLink,
  createConnectAccount,
  isChargesEnabled,
  retrieveConnectAccount,
} from "@/utils/stripe/connect"

export type StripeOnboardingResult = {
  error?: string
  url?: string
}

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function startStripeOnboarding(): Promise<StripeOnboardingResult> {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in." }
  }

  const profile = await getProfile(user.id)

  if (!profile) {
    return { error: "Profile not found." }
  }

  let accountId = profile.stripe_account_id

  if (!accountId) {
    try {
      const account = await createConnectAccount(user.email ?? "")
      accountId = account.id

      const { error } = await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id)

      if (error) {
        return { error: "Could not save Stripe account." }
      }
    } catch {
      return { error: "Could not create Stripe account." }
    }
  }

  try {
    const link = await createAccountLink(accountId)
    revalidatePath("/settings/profile")
    return { url: link.url }
  } catch {
    return { error: "Could not start Stripe onboarding." }
  }
}

export async function refreshStripeAccountStatus(): Promise<{
  error?: string
  chargesEnabled?: boolean
}> {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in." }
  }

  const profile = await getProfile(user.id)

  if (!profile?.stripe_account_id) {
    return { chargesEnabled: false }
  }

  try {
    const account = await retrieveConnectAccount(profile.stripe_account_id)
    const chargesEnabled = isChargesEnabled(account)

    await supabase
      .from("profiles")
      .update({ charges_enabled: chargesEnabled })
      .eq("id", user.id)

    revalidatePath("/settings/profile")
    revalidatePath("/invoices")

    return { chargesEnabled }
  } catch {
    return { error: "Could not refresh Stripe status." }
  }
}
