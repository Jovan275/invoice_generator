import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

import { formatMoney } from "@/lib/money"
import {
  formatPartyLines,
  type PartySnapshot,
} from "@/lib/invoice"
import type { InvoiceItemRow } from "@/lib/invoices/types"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#555",
  },
  partyBlock: {
    lineHeight: 1.4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colDescription: { width: "38%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "12%" },
  colPrice: { width: "14%", textAlign: "right" },
  colVat: { width: "10%", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },
  totals: {
    marginTop: 16,
    alignSelf: "flex-end",
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    color: "#555",
  },
  grandTotal: {
    fontWeight: 700,
    fontSize: 12,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  comments: {
    marginTop: 24,
    lineHeight: 1.4,
  },
})

type InvoicePdfProps = {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  currency: string
  sender: PartySnapshot
  client: PartySnapshot
  items: InvoiceItemRow[]
  subtotal: number
  tax: number
  total: number
  comments: string | null
}

function PartyBlock({ party }: { party: PartySnapshot }) {
  const lines = formatPartyLines(party)

  return (
    <View style={styles.partyBlock}>
      {lines.map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
    </View>
  )
}

export function InvoicePdfDocument({
  invoiceNumber,
  invoiceDate,
  dueDate,
  currency,
  sender,
  client,
  items,
  subtotal,
  tax,
  total,
  comments,
}: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text>{invoiceNumber}</Text>
          </View>
          <View>
            <View style={styles.metaRow}>
              <Text>Invoice date:</Text>
              <Text>{invoiceDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text>Due date:</Text>
              <Text>{dueDate}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 24, marginBottom: 20 }}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>From</Text>
            <PartyBlock party={sender} />
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>To</Text>
            <PartyBlock party={client} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDescription}>Description</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colUnit}>Unit</Text>
              <Text style={styles.colPrice}>Price</Text>
              <Text style={styles.colVat}>VAT %</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colDescription}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colUnit}>
                  {item.unit_type === "hours" ? "hours" : "flat"}
                </Text>
                <Text style={styles.colPrice}>
                  {formatMoney(item.unit_price, currency)}
                </Text>
                <Text style={styles.colVat}>{item.vat_rate}%</Text>
                <Text style={styles.colTotal}>
                  {formatMoney(item.line_total ?? 0, currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{formatMoney(subtotal, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text>{formatMoney(tax, currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{formatMoney(total, currency)}</Text>
          </View>
        </View>

        {comments?.trim() ? (
          <View style={styles.comments}>
            <Text style={styles.sectionTitle}>Comments</Text>
            <Text>{comments.trim()}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
