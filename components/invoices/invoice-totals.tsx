"use client"

import { calculateInvoiceTotals } from "@/lib/invoice"
import { formatMoney } from "@/lib/money"

type InvoiceTotalsProps = {
  items: Array<{
    quantity: string | number
    unit_price: string | number
    vat_rate: string | number
  }>
  currency: string
}

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value) || 0
}

export function InvoiceTotals({ items, currency }: InvoiceTotalsProps) {
  const normalized = items.map((item) => ({
    description: "",
    unit_type: "flat" as const,
    quantity: toNumber(item.quantity),
    unit_price: toNumber(item.unit_price),
    vat_rate: toNumber(item.vat_rate),
  }))

  const { subtotal, tax, total } = calculateInvoiceTotals(normalized)

  return (
    <div className="ml-auto w-full max-w-xs space-y-2 rounded-lg border bg-muted/30 p-4">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatMoney(subtotal, currency)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tax</span>
        <span>{formatMoney(tax, currency)}</span>
      </div>
      <div className="flex justify-between border-t pt-2 text-base font-semibold">
        <span>Total</span>
        <span>{formatMoney(total, currency)}</span>
      </div>
    </div>
  )
}
