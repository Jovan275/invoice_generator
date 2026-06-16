import { AppHeader } from "@/components/app/app-header"
import { requireAuth } from "@/lib/auth/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader userEmail={user.email ?? ""} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
        {children}
      </main>
    </div>
  )
}
