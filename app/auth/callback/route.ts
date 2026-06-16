import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { createClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (!code) {
    redirect("/login?error=auth")
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    redirect("/login?error=auth")
  }

  const safeNext = next.startsWith("/") ? next : "/dashboard"
  redirect(`${origin}${safeNext}`)
}
