import Link from "next/link"
import { RiInformationLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"

export function ProfileIncompleteBanner() {
  return (
    <div
      role="status"
      className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-3">
        <RiInformationLine
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">Add your sender details</p>
          <p className="text-sm text-muted-foreground">
            Add your name or company so invoices show who they&apos;re from.
            All fields are optional.
          </p>
        </div>
      </div>

      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link href="/settings/profile">Complete profile</Link>
      </Button>
    </div>
  )
}
