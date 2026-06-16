import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProfileForm } from "@/components/settings/profile-form"
import { getProfile } from "@/lib/profile/queries"
import { requireAuth } from "@/lib/auth/session"

export default async function ProfileSettingsPage() {
  const user = await requireAuth()
  const profile = await getProfile(user.id)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Sender details
        </h1>
        <p className="mt-2 text-muted-foreground">
          These details appear in the &quot;From&quot; section of your invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            All fields are optional. Update them any time — changes apply to
            future invoices only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            profile={profile}
            authEmail={user.email ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  )
}
