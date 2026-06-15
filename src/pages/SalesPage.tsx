import { useEffect, useState } from "react"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Printer,
  Loader2,
  Flame,
  Cylinder,
} from "lucide-react"
import { Badge, Button, Card } from "@/components/ui"
import { DateRangePicker } from "@/components/DateRangePicker"
import {
  getSales,
  type DateRange,
  type SalesResponse,
} from "@/lib/api"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

function defaultRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

const summaryCards = [
  {
    key: "totalRevenue" as const,
    label: "Total Revenue",
    icon: DollarSign,
    format: (v: number) => formatCurrency(v),
    tint: "bg-primary/10 text-primary",
  },
  {
    key: "totalOrders" as const,
    label: "Total Orders",
    icon: ShoppingCart,
    format: (v: number) => v.toLocaleString(),
    tint: "bg-accent/15 text-accent",
  },
  {
    key: "averageTransactionValue" as const,
    label: "Average Transaction Value",
    icon: TrendingUp,
    format: (v: number) => formatCurrency(v),
    tint: "bg-success/15 text-success",
  },
]

export function SalesPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [data, setData] = useState<SalesResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    getSales(range).then((res) => {
      if (active) {
        setData(res)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [range])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sales Report
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review LPG refill and tank sales across a selected date range.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <DateRangePicker value={range} onChange={setRange} />
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map(({ key, label, icon: Icon, format, tint }) => (
          <Card key={key} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  tint,
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">
              {loading || !data ? (
                <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted align-middle" />
              ) : (
                format(data.summary[key])
              )}
            </p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold text-foreground">Sales Records</h3>
          {data && !loading && (
            <span className="text-sm text-muted-foreground">
              {data.records.length} record
              {data.records.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Transaction ID</th>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 text-right font-medium">Quantity</th>
                <th className="px-5 py-3 text-right font-medium">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading sales records...
                    </span>
                  </td>
                </tr>
              ) : data && data.records.length > 0 ? (
                data.records.map((r) => {
                  const isTank = r.item === "LPG Tank"
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-foreground">
                        {formatDate(r.date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">
                        {r.transactionId}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          className={cn(
                            "gap-1.5",
                            isTank
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/15 text-accent",
                          )}
                        >
                          {isTank ? (
                            <Cylinder className="h-3.5 w-3.5" />
                          ) : (
                            <Flame className="h-3.5 w-3.5" />
                          )}
                          {r.item}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {r.quantity}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                        {formatCurrency(r.totalAmount)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    No sales records found for the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
