"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import {
  normalizeProfileFormValues,
  profileFormSchema,
  type ProfileFormValues,
} from "@/lib/profile/schema"
import { getFirstError } from "@/lib/validation"
import { createClient } from "@/utils/supabase/server"

export type UpdateProfileResult = {
  error?: string
  success?: boolean
}

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function updateProfile(
  values: ProfileFormValues
): Promise<UpdateProfileResult> {
  const parsed = profileFormSchema.safeParse(values)

  if (!parsed.success) {
    return { error: getFirstError(parsed.error, "Invalid profile details.") }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to update your profile." }
  }

  const payload = normalizeProfileFormValues(parsed.data)

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)

  if (error) {
    return { error: "Could not save profile. Please try again." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/settings/profile")

  return { success: true }
}
