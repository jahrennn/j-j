import { usePrivacy, privateText, requireVisibleDetails } from "@/lib/privacy"
import { useEffect, useState } from "react"
import { Button, Card } from "@/components/ui"
import { getExpenseProfit, type DateRange, type ExpenseProfit } from "@/lib/api"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

type ExpenseProfitPanelProps = {
  range?: DateRange; revision?: number; title?: string
}

export function ExpenseProfitPanel(props: ExpenseProfitPanelProps) {
  // A changed date selection must never display totals from the previous period,
  // even for the render before its request effect runs.
  return <ExpenseProfitContent key={`${props.range?.startDate ?? "month"}/${props.range?.endDate ?? "month"}`} {...props} />
}

function ExpenseProfitContent({ range, revision = 0, title = "This month's profit" }: ExpenseProfitPanelProps) {
  const { privacyEnabled } = usePrivacy()
  const [profit, setProfit] = useState<ExpenseProfit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  const startDate = range?.startDate
  const endDate = range?.endDate
  const hasRange = range !== undefined

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    setProfit(null)
    if (hasRange && (!startDate || !endDate || startDate > endDate)) {
      setError("Select a valid start date and end date to calculate net profit.")
      setLoading(false)
      return
    }
    getExpenseProfit(startDate && endDate ? { startDate, endDate } : undefined).then((result) => {
      if (hasRange && (result.startDate !== startDate || result.endDate !== endDate)) {
        throw new Error("The server returned profit for different dates. Retry to load the selected period.")
      }
      if (active) setProfit(result)
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load profit after expenses")
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [hasRange, startDate, endDate, revision, retry])

  return <Card className="overflow-hidden">
    <div className="border-b border-border px-5 py-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {startDate && endDate ? `${formatDate(startDate)} – ${formatDate(endDate)} · ` : profit ? `${formatDate(profit.startDate)} – ${formatDate(profit.endDate)} · ` : ""}
        Gross profit − operating expenses = net profit. Voided expenses are excluded.
      </p>
    </div>
    {error ? <div role="alert" className="flex flex-wrap items-center gap-3 p-5 text-sm text-destructive">
      {error}<Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>Retry</Button>
    </div> : <div className="grid gap-4 p-5 sm:grid-cols-3" aria-busy={loading}>
      <div><p className="text-sm text-muted-foreground">Gross Profit</p>
        <p className="mt-2 text-2xl font-bold">{profit ? formatCurrency(profit.grossProfit) : "Loading…"}</p></div>
      <div><p className="text-sm text-muted-foreground">Operating Expenses</p>
        <p className="mt-2 text-2xl font-bold text-destructive">{profit ? formatCurrency(profit.operatingExpenses) : "Loading…"}</p></div>
      <div><p className="text-sm font-medium text-muted-foreground">Net Profit</p>
        <p className={cn("mt-2 text-2xl font-bold", profit && profit.netProfit < 0 ? "text-destructive" : "text-success")}>
          {profit ? formatCurrency(profit.netProfit) : "Loading…"}</p>
        {profit && profit.netProfit < 0 && <p className="mt-1 text-xs text-destructive">Expenses exceed gross profit for this period.</p>}
      </div>
    </div>}
  </Card>
}
