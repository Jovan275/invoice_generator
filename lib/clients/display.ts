type ClientLabelFields = {
  full_name?: string | null
  company_name?: string | null
  email?: string | null
}

function trim(value: string | null | undefined) {
  return value?.trim() ?? ""
}

export function formatClientListLabel(client: ClientLabelFields): string {
  const company = trim(client.company_name)
  const name = trim(client.full_name)
  const email = trim(client.email)

  if (company && name) {
    return `${company} — ${name}`
  }

  if (company) {
    return company
  }

  if (name) {
    return name
  }

  if (email) {
    return email
  }

  return "Unnamed client"
}

export function formatClientSelectLabel(client: ClientLabelFields): string {
  const company = trim(client.company_name)
  const name = trim(client.full_name)
  const email = trim(client.email)

  if (name && company) {
    return `${name} (${company})`
  }

  if (name) {
    return name
  }

  if (company) {
    return company
  }

  if (email) {
    return email
  }

  return "Unnamed client"
}
