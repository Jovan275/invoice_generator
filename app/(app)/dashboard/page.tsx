import Link from "next/link"

import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import { ProfileIncompleteBanner } from "@/components/settings/profile-incomplete-banner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireAuth } from "@/lib/auth/session"
import { formatPartyName } from "@/lib/invoice"
import { formatMoney } from "@/lib/money"
import {
  getDashboardStats,
  getRecentInvoices,
} from "@/lib/invoices/queries"
import { getProfile } from "@/lib/profile/queries"
import { isProfileIncomplete } from "@/lib/profile/types"

export default async function DashboardPage() {
  const user = await requireAuth()
  const [profile, stats, recentInvoices] = await Promise.all([
    getProfile(user.id),
    getDashboardStats(),
    getRecentInvoices(5),
  ])

  const showProfileBanner =
    !profile || isProfileIncomplete(profile)

  return (
    <div className="space-y-6">
      {showProfileBanner ? <ProfileIncompleteBanner /> : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back, {user.email}.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">New invoice</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-2xl">
              {formatMoney(stats.totalOutstanding, "EUR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.outstandingCount} unpaid invoice
              {stats.outstandingCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl">
              {formatMoney(stats.totalPaid, "EUR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.paidCount} paid invoice
              {stats.paidCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total invoices</CardDescription>
            <CardTitle className="text-2xl">{stats.invoiceCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payments</CardDescription>
            <CardTitle className="text-base font-medium">
              {profile?.charges_enabled
                ? "Ready to collect"
                : "Setup required"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profile?.charges_enabled ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/profile">Complete setup</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent invoices</CardTitle>
            <CardDescription>Your latest invoice activity</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invoices yet. Create your first invoice to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {formatPartyName(invoice.client_snapshot)}
                    </TableCell>
                    <TableCell>
                      {formatMoney(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
