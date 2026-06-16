export type Profile = {
  id: string
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  website: string | null
  stripe_account_id: string | null
  charges_enabled: boolean
  invoice_seq: number
  created_at: string
  updated_at: string
}

export type ProfileSenderDetails = Pick<
  Profile,
  | "id"
  | "full_name"
  | "company_name"
  | "email"
  | "address"
  | "vat_id"
  | "website"
  | "stripe_account_id"
  | "charges_enabled"
>

export function isProfileIncomplete(
  profile: Pick<Profile, "full_name" | "company_name">
): boolean {
  const hasName = Boolean(profile.full_name?.trim())
  const hasCompany = Boolean(profile.company_name?.trim())
  return !hasName && !hasCompany
}

export function toProfileFormDefaults(
  profile: ProfileSenderDetails | null,
  authEmail: string
) {
  return {
    full_name: profile?.full_name ?? "",
    company_name: profile?.company_name ?? "",
    email: profile?.email?.trim() || authEmail,
    address: profile?.address ?? "",
    vat_id: profile?.vat_id ?? "",
    website: profile?.website ?? "",
  }
}
