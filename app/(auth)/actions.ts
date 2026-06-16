"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getAppUrl } from "@/lib/auth/session"
import {
  validateEmail,
  validatePasswordConfirmation,
} from "@/lib/auth/validation"
import { createClient } from "@/utils/supabase/server"

export type AuthActionState = {
  error?: string
  success?: string
}

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get("email")?.toString() ?? null
  const password = formData.get("password")?.toString() ?? null

  const emailError = validateEmail(email)
  if (emailError) {
    return { error: emailError }
  }

  if (!password) {
    return { error: "Password is required." }
  }

  const supabase = await getSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: email!.trim(),
    password,
  })

  if (error) {
    return { error: "Invalid email or password." }
  }

  redirect("/dashboard")
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get("email")?.toString() ?? null
  const password = formData.get("password")?.toString() ?? null
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? null

  const emailError = validateEmail(email)
  if (emailError) {
    return { error: emailError }
  }

  const passwordError = validatePasswordConfirmation(password, confirmPassword)
  if (passwordError) {
    return { error: passwordError }
  }

  const supabase = await getSupabaseClient()
  const { error } = await supabase.auth.signUp({
    email: email!.trim(),
    password: password!,
  })

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "An account with this email already exists." }
    }

    return { error: error.message }
  }

  await supabase.auth.signOut()
  redirect("/login?registered=1")
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get("email")?.toString() ?? null
  const emailError = validateEmail(email)

  if (emailError) {
    return { error: emailError }
  }

  const supabase = await getSupabaseClient()
  const appUrl = getAppUrl()
  const { error } = await supabase.auth.resetPasswordForEmail(email!.trim(), {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success:
      "If an account exists for that email, we sent a password reset link.",
  }
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = formData.get("password")?.toString() ?? null
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? null

  const passwordError = validatePasswordConfirmation(password, confirmPassword)
  if (passwordError) {
    return { error: passwordError }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: "Your reset link has expired. Please request a new password reset.",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: password!,
  })

  if (error) {
    return { error: error.message }
  }

  await supabase.auth.signOut()
  redirect("/login?reset=1")
}

export async function signOut() {
  const supabase = await getSupabaseClient()
  await supabase.auth.signOut()
  redirect("/login")
}
