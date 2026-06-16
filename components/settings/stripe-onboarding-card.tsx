"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  refreshStripeAccountStatus,
  startStripeOnboarding,
} from "@/app/(app)/settings/stripe-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type StripeOnboardingCardProps = {
  chargesEnabled: boolean
  hasAccount: boolean
}

export function StripeOnboardingCard({
  chargesEnabled,
  hasAccount,
}: StripeOnboardingCardProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleStart() {
    setIsPending(true)
    const result = await startStripeOnboarding()
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.url) {
      window.location.href = result.url
    }
  }

  async function handleRefresh() {
    setIsPending(true)
    const result = await refreshStripeAccountStatus()
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(
      result.chargesEnabled
        ? "Payment setup complete."
        : "Stripe status refreshed."
    )
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment onboarding</CardTitle>
        <CardDescription>
          Connect Stripe to collect invoice payments directly to your bank
          account. Sending invoices is blocked until onboarding is complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          Status:{" "}
          <span className="font-medium">
            {chargesEnabled ? "Ready to collect payments" : "Not complete"}
          </span>
        </p>

        <div className="flex flex-wrap gap-2">
          {!chargesEnabled ? (
            <Button onClick={() => void handleStart()} disabled={isPending}>
              {isPending
                ? "Opening Stripe..."
                : hasAccount
                  ? "Continue Stripe setup"
                  : "Connect with Stripe"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isPending}
          >
            Refresh status
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
