import { cookies } from "next/headers"

import type { ClientListItem } from "@/lib/clients/types"
import { createClient } from "@/utils/supabase/server"

const clientSelect =
  "id, full_name, company_name, email, address, vat_id, created_at" as const

export const CLIENTS_PAGE_SIZE = 10

type GetClientsParams = {
  page?: number
  pageSize?: number
  search?: string
}

function applySearchFilter<
  T extends {
    or: (filters: string) => T
  },
>(query: T, search: string | undefined) {
  const trimmed = search?.trim()

  if (!trimmed) {
    return query
  }

  const sanitized = trimmed.replace(/,/g, "").replace(/[%_\\]/g, "\\$&")
  const pattern = `%${sanitized}%`

  return query.or(
    `full_name.ilike.${pattern},company_name.ilike.${pattern},email.ilike.${pattern}`
  )
}

export async function getClients({
  page = 1,
  pageSize = CLIENTS_PAGE_SIZE,
  search,
}: GetClientsParams = {}): Promise<ClientListItem[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("clients")
    .select(clientSelect)
    .order("created_at", { ascending: false })
    .range(from, to)

  query = applySearchFilter(query, search)

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getClientsCount(search?: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let query = supabase
    .from("clients")
    .select("id", { count: "exact", head: true })

  query = applySearchFilter(query, search)

  const { count, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

export async function getClient(id: string): Promise<ClientListItem | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("clients")
    .select(clientSelect)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
