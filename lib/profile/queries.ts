import { cookies } from "next/headers"

import type { ProfileSenderDetails } from "@/lib/profile/types"
import { createClient } from "@/utils/supabase/server"

const profileSelect =
  "id, full_name, company_name, email, address, vat_id, website" as const

export async function getProfile(
  userId: string
): Promise<ProfileSenderDetails | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
