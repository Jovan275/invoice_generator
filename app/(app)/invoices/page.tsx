import Link from "next/link"

import { InvoicesTable } from "@/components/invoices/invoices-table"
import { Button } from "@/components/ui/button"
import { requireAuth } from "@/lib/auth/session"
import {
  getInvoicePdfSignedUrl,
  getInvoices,
  getInvoicesCount,
} from "@/lib/invoices/queries"
import { INVOICES_PAGE_SIZE } from "@/lib/invoices/types"

type InvoicesPageProps = {
  searchParams: Promise<{
    page?: string
  }>
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  await requireAuth()

  const params = await searchParams
  const totalCount = await getInvoicesCount()
  const totalPages = Math.max(1, Math.ceil(totalCount / INVOICES_PAGE_SIZE))
  const page = Math.min(parsePage(params.page), totalPages)

  const invoices = await getInvoices({ page })

  const pdfUrls: Record<string, string | null> = {}

  await Promise.all(
    invoices.map(async (invoice) => {
      pdfUrls[invoice.id] = invoice.pdf_storage_path
        ? await getInvoicePdfSignedUrl(invoice.pdf_storage_path)
        : null
    })
  )

  const buildPageHref = (targetPage: number) => {
    if (targetPage <= 1) {
      return "/invoices"
    }

    return `/invoices?page=${targetPage}`
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-2 text-muted-foreground">
            View, send, and manage your invoices.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">New invoice</Link>
        </Button>
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
          <h2 className="text-lg font-medium">No invoices yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create your first invoice to send it to a client and collect payment.
          </p>
          <Button asChild className="mt-6">
            <Link href="/invoices/new">Create your first invoice</Link>
          </Button>
        </div>
      ) : (
        <>
          <InvoicesTable invoices={invoices} pdfUrls={pdfUrls} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                >
                  <Link
                    href={buildPageHref(page - 1)}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  >
                    Previous
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                >
                  <Link
                    href={buildPageHref(page + 1)}
                    aria-disabled={page >= totalPages}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
