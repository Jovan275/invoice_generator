"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import {
  calculateInvoiceTotals,
  buildEmailSubject,
  defaultEmailBody,
  type PartySnapshot,
} from "@/lib/invoice"
import { formatMoney } from "@/lib/money"
import {
  generateInvoicePdfBuffer,
  uploadInvoicePdf,
  deleteInvoicePdf,
  downloadInvoicePdfBytes,
} from "@/lib/invoices/pdf"
import {
  invoiceFormSchema,
  sendInvoiceSchema,
  type InvoiceFormValues,
  type SendInvoiceFormValues,
} from "@/lib/invoices/schema"
import { getProfile } from "@/lib/profile/queries"
import { createClient as createSupabaseClient } from "@/utils/supabase/server"
import { createInvoiceCheckoutSession } from "@/utils/stripe/checkout"
import { expireCheckoutSession } from "@/utils/stripe/connect"
import { sendEmail } from "@/utils/resend/email"

export type InvoiceActionResult = {
  error?: string
  success?: boolean
  id?: string
  needsResend?: boolean
}

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createSupabaseClient(cookieStore)
}

function toSenderSnapshot(
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>
): PartySnapshot {
  return {
    full_name: profile.full_name,
    company_name: profile.company_name,
    email: profile.email,
    address: profile.address,
    vat_id: profile.vat_id,
    website: profile.website,
  }
}

function toClientSnapshot(client: {
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
}): PartySnapshot {
  return {
    full_name: client.full_name,
    company_name: client.company_name,
    email: client.email,
    address: client.address,
    vat_id: client.vat_id,
  }
}

async function getOwnedClient(clientId: string, userId: string) {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, company_name, email, address, vat_id")
    .eq("id", clientId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function getOwnedInvoice(invoiceId: string, userId: string) {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function syncCheckoutSession(
  invoice: {
    id: string
    invoice_number: string
    total: number
    currency: string
    stripe_checkout_session_id: string | null
  },
  stripeAccountId: string
) {
  const supabase = await getSupabaseClient()

  if (invoice.stripe_checkout_session_id) {
    await expireCheckoutSession(
      invoice.stripe_checkout_session_id,
      stripeAccountId
    )
  }

  const session = await createInvoiceCheckoutSession({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    total: Number(invoice.total),
    currency: invoice.currency,
    stripeAccountId,
  })

  const { error } = await supabase
    .from("invoices")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_payment_link_url: session.url,
      stripe_payment_status: session.status,
    })
    .eq("id", invoice.id)

  if (error) {
    throw new Error(error.message)
  }

  return session.url
}

async function loadInvoiceDetail(invoiceId: string) {
  const supabase = await getSupabaseClient()

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle()

  if (error || !invoice) {
    throw new Error("Invoice not found.")
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: true })

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return {
    ...invoice,
    sender_snapshot: invoice.sender_snapshot as PartySnapshot,
    client_snapshot: invoice.client_snapshot as PartySnapshot,
    items: items ?? [],
  }
}

async function regeneratePdf(invoiceId: string, userId: string) {
  const cookieStore = await cookies()
  const detail = await loadInvoiceDetail(invoiceId)
  const pdfBuffer = await generateInvoicePdfBuffer({
    ...detail,
    sender_snapshot: detail.sender_snapshot,
    client_snapshot: detail.client_snapshot,
  })
  const storagePath = await uploadInvoicePdf(
    cookieStore,
    userId,
    invoiceId,
    pdfBuffer
  )

  const supabase = await getSupabaseClient()
  const { error } = await supabase
    .from("invoices")
    .update({
      pdf_path: storagePath,
      pdf_storage_path: storagePath,
    })
    .eq("id", invoiceId)

  if (error) {
    throw new Error(error.message)
  }

  return storagePath
}

export async function createInvoice(
  values: InvoiceFormValues
): Promise<InvoiceActionResult> {
  const parsed = invoiceFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid invoice details.",
    }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to create an invoice." }
  }

  const profile = await getProfile(user.id)

  if (!profile) {
    return { error: "Profile not found." }
  }

  const client = await getOwnedClient(parsed.data.client_id, user.id)

  if (!client) {
    return { error: "Selected client was not found." }
  }

  const totals = calculateInvoiceTotals(parsed.data.line_items)
  const invoiceYear = new Date(parsed.data.invoice_date).getFullYear()

  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_invoice_number",
    { p_year: invoiceYear }
  )

  if (numberError || !invoiceNumber) {
    return { error: "Could not generate invoice number." }
  }

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      invoice_number: invoiceNumber,
      client_id: client.id,
      sender_snapshot: toSenderSnapshot(profile),
      client_snapshot: toClientSnapshot(client),
      invoice_date: parsed.data.invoice_date,
      due_date: parsed.data.due_date,
      currency: parsed.data.currency,
      comments: parsed.data.comments || null,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      status: "not_paid",
    })
    .select("id")
    .single()

  if (insertError || !invoice) {
    return { error: "Could not create invoice." }
  }

  const itemsPayload = parsed.data.line_items.map((item, index) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_type: item.unit_type,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    position: index,
  }))

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(itemsPayload)

  if (itemsError) {
    await supabase.from("invoices").delete().eq("id", invoice.id)
    return { error: "Could not save line items." }
  }

  try {
    await regeneratePdf(invoice.id, user.id)
  } catch {
    await supabase.from("invoices").delete().eq("id", invoice.id)
    return { error: "Could not generate invoice PDF." }
  }

  if (profile.charges_enabled && profile.stripe_account_id) {
    try {
      await syncCheckoutSession(
        {
          id: invoice.id,
          invoice_number: invoiceNumber,
          total: totals.total,
          currency: parsed.data.currency,
          stripe_checkout_session_id: null,
        },
        profile.stripe_account_id
      )
    } catch {
      // Payment link can be created later when sending.
    }
  }

  revalidatePath("/invoices")
  revalidatePath("/dashboard")

  return { success: true, id: invoice.id }
}

export async function updateInvoice(
  id: string,
  values: InvoiceFormValues
): Promise<InvoiceActionResult> {
  const parsed = invoiceFormSchema.safeParse(values)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid invoice details.",
    }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to update an invoice." }
  }

  const existing = await getOwnedInvoice(id, user.id)

  if (!existing) {
    return { error: "Invoice not found." }
  }

  if (existing.status === "paid") {
    return { error: "Paid invoices cannot be edited." }
  }

  const client = await getOwnedClient(parsed.data.client_id, user.id)

  if (!client) {
    return { error: "Selected client was not found." }
  }

  const totals = calculateInvoiceTotals(parsed.data.line_items)
  const totalChanged = Number(existing.total) !== totals.total
  const profile = await getProfile(user.id)

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      client_id: client.id,
      client_snapshot: toClientSnapshot(client),
      invoice_date: parsed.data.invoice_date,
      due_date: parsed.data.due_date,
      currency: parsed.data.currency,
      comments: parsed.data.comments || null,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
    })
    .eq("id", id)

  if (updateError) {
    return { error: "Could not update invoice." }
  }

  const { error: deleteItemsError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", id)

  if (deleteItemsError) {
    return { error: "Could not update line items." }
  }

  const itemsPayload = parsed.data.line_items.map((item, index) => ({
    invoice_id: id,
    description: item.description,
    quantity: item.quantity,
    unit_type: item.unit_type,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    position: index,
  }))

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(itemsPayload)

  if (itemsError) {
    return { error: "Could not save line items." }
  }

  try {
    await regeneratePdf(id, user.id)
  } catch {
    return { error: "Could not regenerate invoice PDF." }
  }

  if (
    totalChanged &&
    profile?.charges_enabled &&
    profile.stripe_account_id
  ) {
    try {
      await syncCheckoutSession(
        {
          id,
          invoice_number: existing.invoice_number,
          total: totals.total,
          currency: parsed.data.currency,
          stripe_checkout_session_id: existing.stripe_checkout_session_id,
        },
        profile.stripe_account_id
      )
    } catch {
      return { error: "Could not refresh payment link." }
    }
  }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${id}`)
  revalidatePath(`/invoices/${id}/edit`)
  revalidatePath("/dashboard")

  return {
    success: true,
    id,
    needsResend: Boolean(existing.last_sent_at),
  }
}

export async function deleteInvoice(id: string): Promise<InvoiceActionResult> {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to delete an invoice." }
  }

  const existing = await getOwnedInvoice(id, user.id)

  if (!existing) {
    return { error: "Invoice not found." }
  }

  if (existing.status === "paid") {
    return { error: "Paid invoices cannot be deleted." }
  }

  const profile = await getProfile(user.id)

  if (
    existing.stripe_checkout_session_id &&
    profile?.stripe_account_id
  ) {
    await expireCheckoutSession(
      existing.stripe_checkout_session_id,
      profile.stripe_account_id
    )
  }

  if (existing.pdf_storage_path) {
    try {
      const cookieStore = await cookies()
      await deleteInvoicePdf(cookieStore, existing.pdf_storage_path)
    } catch {
      // Continue with invoice delete even if storage cleanup fails.
    }
  }

  const { error } = await supabase.from("invoices").delete().eq("id", id)

  if (error) {
    return { error: "Could not delete invoice." }
  }

  revalidatePath("/invoices")
  revalidatePath("/dashboard")

  return { success: true }
}

export async function markInvoicePaid(
  id: string
): Promise<InvoiceActionResult> {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in." }
  }

  const existing = await getOwnedInvoice(id, user.id)

  if (!existing) {
    return { error: "Invoice not found." }
  }

  if (existing.status === "paid") {
    return { success: true }
  }

  const profile = await getProfile(user.id)

  if (
    existing.stripe_checkout_session_id &&
    profile?.stripe_account_id
  ) {
    await expireCheckoutSession(
      existing.stripe_checkout_session_id,
      profile.stripe_account_id
    )
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      stripe_payment_link_url: null,
      stripe_payment_status: "paid",
    })
    .eq("id", id)

  if (error) {
    return { error: "Could not mark invoice as paid." }
  }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${id}`)
  revalidatePath("/dashboard")

  return { success: true }
}

export async function sendInvoice(
  id: string,
  values: SendInvoiceFormValues
): Promise<InvoiceActionResult> {
  const parsed = sendInvoiceSchema.safeParse(values)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid send details.",
    }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to send an invoice." }
  }

  const existing = await getOwnedInvoice(id, user.id)

  if (!existing) {
    return { error: "Invoice not found." }
  }

  if (existing.status === "paid") {
    return { error: "Paid invoices cannot be sent." }
  }

  const profile = await getProfile(user.id)

  if (!profile?.charges_enabled || !profile.stripe_account_id) {
    return {
      error:
        "Complete payment onboarding in Settings before sending invoices.",
    }
  }

  let paymentUrl = existing.stripe_payment_link_url

  if (!paymentUrl) {
    try {
      paymentUrl = await syncCheckoutSession(
        {
          id: existing.id,
          invoice_number: existing.invoice_number,
          total: Number(existing.total),
          currency: existing.currency,
          stripe_checkout_session_id: existing.stripe_checkout_session_id,
        },
        profile.stripe_account_id
      )
    } catch {
      return { error: "Could not create payment link." }
    }
  }

  const sender = existing.sender_snapshot as PartySnapshot
  const subject = buildEmailSubject(existing.invoice_number, sender)
  const replyTo =
    profile.email?.trim() || user.email || undefined
  const bcc = user.email ?? undefined

  let html = parsed.data.message_html
  if (paymentUrl) {
    html = html.replace(
      "{{PAYMENT_LINK}}",
      `<a href="${paymentUrl}">Pay invoice online</a>`
    )
  } else {
    html = html.replace("{{PAYMENT_LINK}}", "")
  }

  const cookieStore = await cookies()
  let pdfBuffer: Buffer

  try {
    if (existing.pdf_storage_path) {
      pdfBuffer = await downloadInvoicePdfBytes(
        cookieStore,
        existing.pdf_storage_path
      )
    } else {
      await regeneratePdf(id, user.id)
      const refreshed = await getOwnedInvoice(id, user.id)
      pdfBuffer = await downloadInvoicePdfBytes(
        cookieStore,
        refreshed!.pdf_storage_path!
      )
    }
  } catch {
    return { error: "Could not attach invoice PDF." }
  }

  try {
    await sendEmail({
      to: parsed.data.recipient_email,
      subject,
      html,
      bcc,
      replyTo,
      attachments: [
        {
          filename: `${existing.invoice_number}.pdf`,
          content: pdfBuffer,
        },
      ],
    })
  } catch {
    return { error: "Could not send email. Please try again." }
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("id", id)

  if (updateError) {
    return { error: "Email sent, but could not update send timestamp." }
  }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${id}`)

  return { success: true }
}

export async function getDefaultSendMessage(invoiceId: string) {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const existing = await getOwnedInvoice(invoiceId, user.id)

  if (!existing) {
    return { error: "Invoice not found." }
  }

  const totalFormatted = formatMoney(
    Number(existing.total),
    existing.currency
  )

  return {
    message_html: defaultEmailBody(existing.invoice_number, totalFormatted),
    recipient_email:
      (existing.client_snapshot as PartySnapshot).email?.trim() ?? "",
  }
}
