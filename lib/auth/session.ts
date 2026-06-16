import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/utils/supabase/server"

export async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function requireAuth() {
  const user = await getAuthUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function redirectIfAuthenticated() {
  const user = await getAuthUser()

  if (user) {
    redirect("/dashboard")
  }
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}
