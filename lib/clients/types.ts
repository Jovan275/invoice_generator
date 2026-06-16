export type Client = {
  id: string
  user_id: string
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  created_at: string
  updated_at: string
}

export type ClientListItem = Pick<
  Client,
  | "id"
  | "full_name"
  | "company_name"
  | "email"
  | "address"
  | "vat_id"
  | "created_at"
>

export function toClientFormDefaults(client: ClientListItem | null) {
  return {
    full_name: client?.full_name ?? "",
    company_name: client?.company_name ?? "",
    email: client?.email ?? "",
    address: client?.address ?? "",
    vat_id: client?.vat_id ?? "",
  }
}
