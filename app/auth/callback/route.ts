import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { sanitizeRedirectPath } from "@/lib/auth/redirect"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next")

  if (!code) {
    redirect("/login?error=auth")
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    redirect("/login?error=auth")
  }

  const safeNext = sanitizeRedirectPath(next)
  redirect(`${origin}${safeNext}`)
}
