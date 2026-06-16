import Link from "next/link"
import { Suspense } from "react"

import { ClientsSearch } from "@/components/clients/clients-search"
import { ClientsTable } from "@/components/clients/clients-table"
import { Button } from "@/components/ui/button"
import { requireAuth } from "@/lib/auth/session"
import {
  CLIENTS_PAGE_SIZE,
  getClients,
  getClientsCount,
} from "@/lib/clients/queries"

type ClientsPageProps = {
  searchParams: Promise<{
    page?: string
    q?: string
  }>
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  await requireAuth()

  const params = await searchParams
  const search = params.q?.trim() ?? ""
  const totalCount = await getClientsCount(search)
  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PAGE_SIZE))
  const page = Math.min(parsePage(params.page), totalPages)

  const clients = await getClients({
    page,
    pageSize: CLIENTS_PAGE_SIZE,
    search,
  })

  const currentPage = page
  const showEmptyState = totalCount === 0 && !search

  const buildPageHref = (targetPage: number) => {
    const query = new URLSearchParams()

    if (search) {
      query.set("q", search)
    }

    if (targetPage > 1) {
      query.set("page", String(targetPage))
    }

    const queryString = query.toString()
    return queryString ? `/clients?${queryString}` : "/clients"
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-2 text-muted-foreground">
            Manage the clients you bill. Select them when creating invoices.
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">Add client</Link>
        </Button>
      </div>

      {!showEmptyState && (
        <Suspense fallback={null}>
          <ClientsSearch key={search} defaultValue={search} />
        </Suspense>
      )}

      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
          <h2 className="text-lg font-medium">No clients yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add your first client so you can select them when creating invoices.
          </p>
          <Button asChild className="mt-6">
            <Link href="/clients/new">Add your first client</Link>
          </Button>
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No clients match your search.
          </p>
        </div>
      ) : (
        <>
          <ClientsTable clients={clients} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                >
                  <Link
                    href={buildPageHref(currentPage - 1)}
                    aria-disabled={currentPage <= 1}
                    tabIndex={currentPage <= 1 ? -1 : undefined}
                    className={
                      currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    Previous
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                >
                  <Link
                    href={buildPageHref(currentPage + 1)}
                    aria-disabled={currentPage >= totalPages}
                    tabIndex={currentPage >= totalPages ? -1 : undefined}
                    className={
                      currentPage >= totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
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
