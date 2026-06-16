import { ProfileIncompleteBanner } from "@/components/settings/profile-incomplete-banner"
import { getProfile } from "@/lib/profile/queries"
import { isProfileIncomplete } from "@/lib/profile/types"
import { requireAuth } from "@/lib/auth/session"

export default async function DashboardPage() {
  const user = await requireAuth()
  const profile = await getProfile(user.id)
  const showProfileBanner =
    !profile || isProfileIncomplete(profile)

  return (
    <div className="space-y-4">
      {showProfileBanner ? <ProfileIncompleteBanner /> : null}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome, {user.email}. Your invoice workspace will live here.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">
          Authentication is set up. Next up: clients and invoices.
        </p>
      </div>
    </div>
  )
}
