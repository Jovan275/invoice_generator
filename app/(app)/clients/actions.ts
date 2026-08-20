"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import {
  clientFormSchema,
  normalizeClientFormValues,
  type ClientFormValues,
} from "@/lib/clients/schema"
import { getFirstError } from "@/lib/validation"
import { createClient as createSupabaseClient } from "@/utils/supabase/server"

export type ClientActionResult = {
  error?: string
  success?: boolean
}

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createSupabaseClient(cookieStore)
}

async function getOwnedClient(id: string, userId: string) {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function findDuplicateClientEmail(
  email: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = await getSupabaseClient()

  let query = supabase.from("clients").select("id").ilike("email", email)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}

export async function createClient(
  values: ClientFormValues
): Promise<ClientActionResult> {
  const parsed = clientFormSchema.safeParse(values)

  if (!parsed.success) {
    return { error: getFirstError(parsed.error, "Invalid client details.") }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to add a client." }
  }

  const payload = normalizeClientFormValues(parsed.data)

  try {
    const isDuplicate = await findDuplicateClientEmail(payload.email)

    if (isDuplicate) {
      return { error: "A client with this email already exists." }
    }
  } catch {
    return { error: "Could not verify client email. Please try again." }
  }

  const { error } = await supabase.from("clients").insert({
    user_id: user.id,
    ...payload,
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "A client with this email already exists." }
    }

    return { error: "Could not add client. Please try again." }
  }

  revalidatePath("/clients")

  return { success: true }
}

export async function updateClient(
  id: string,
  values: ClientFormValues
): Promise<ClientActionResult> {
  const parsed = clientFormSchema.safeParse(values)

  if (!parsed.success) {
    return { error: getFirstError(parsed.error, "Invalid client details.") }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to update a client." }
  }

  const payload = normalizeClientFormValues(parsed.data)

  let existing

  try {
    existing = await getOwnedClient(id, user.id)
  } catch {
    return { error: "Could not verify client. Please try again." }
  }

  if (!existing) {
    return { error: "Client not found." }
  }

  try {
    const isDuplicate = await findDuplicateClientEmail(payload.email, id)

    if (isDuplicate) {
      return { error: "A client with this email already exists." }
    }
  } catch {
    return { error: "Could not verify client email. Please try again." }
  }

  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) {
    if (error.code === "23505") {
      return { error: "A client with this email already exists." }
    }

    return { error: "Could not update client. Please try again." }
  }

  if (!data) {
    return { error: "Client not found." }
  }

  revalidatePath("/clients")
  revalidatePath(`/clients/${id}/edit`)

  return { success: true }
}

export async function deleteClient(id: string): Promise<ClientActionResult> {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to delete a client." }
  }

  let existing

  try {
    existing = await getOwnedClient(id, user.id)
  } catch {
    return { error: "Could not verify client. Please try again." }
  }

  if (!existing) {
    return { error: "Client not found." }
  }

  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) {
    return { error: "Could not delete client. Please try again." }
  }

  if (!data) {
    return { error: "Client not found." }
  }

  revalidatePath("/clients")

  return { success: true }
}
