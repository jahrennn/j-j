import { useEffect, useRef, useState, type FormEvent } from "react"
import { Plus, Fuel, Banknote, Wallet, Loader2, Ban } from "lucide-react"
import { Badge, Button, Card, Input, Label, Modal, Select } from "@/components/ui"
import { DateRangePicker } from "@/components/DateRangePicker"
import { ExpenseProfitPanel } from "@/components/ExpenseProfitPanel"
import { createExpense, getExpenses, voidExpense, type DateRange, type ExpenseCategory,
  type ExpenseRecord, type ExpensesResponse } from "@/lib/api"
import { cn, currentMonthRange, formatCurrency, formatDate, philippineToday } from "@/lib/utils"

const CATEGORIES: Record<ExpenseCategory, string> = {
  FUEL: "Gasoline / Fuel", SALARY: "Delivery Salary", MAINTENANCE: "Maintenance",
  UTILITIES: "Utilities", OTHER: "Other Operating Costs",
}
const textAreaClass = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function ExpensesPage() {
  const [range, setRange] = useState<DateRange>(currentMonthRange)
  const [category, setCategory] = useState<ExpenseCategory | "">("")
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<ExpensesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("FUEL")
  const [voidTarget, setVoidTarget] = useState<ExpenseRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState("")
  const [notice, setNotice] = useState("")
  const requestId = useRef("")

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError("")
    setData(null)
    if (!range.startDate || !range.endDate || range.startDate > range.endDate) {
      setLoadError("Select a valid start date and end date.")
      setLoading(false)
      return
    }
    getExpenses(range, category || undefined, page).then((result) => {
      if (active) setData(result)
    }).catch((err) => {
      if (active) setLoadError(err instanceof Error ? err.message : "Could not load expenses")
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [range, category, page, revision])

  function refresh() { setPage(0); setRevision((value) => value + 1) }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setFormError("")
    try {
      const expense = await createExpense({
        requestId: requestId.current, expenseDate: String(fields.get("expenseDate")), category: formCategory,
        description: String(fields.get("description")).trim(), amount: Number(fields.get("amount")),
        paidTo: String(fields.get("paidTo") || "").trim(), notes: String(fields.get("notes") || "").trim(),
      })
      setCreateOpen(false)
      setNotice(`Expense recorded for ${formatDate(expense.expenseDate)}. Net profit for that period has been updated.`)
      refresh()
    } catch (err) { setFormError(err instanceof Error ? err.message : "Could not record expense") }
    finally { setBusy(false) }
  }

  async function handleVoid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !voidTarget) return
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim()
    setBusy(true)
    setFormError("")
    try {
      await voidExpense(voidTarget.id, reason)
      setVoidTarget(null)
      setNotice("Expense voided. It remains in history and is excluded from expenses and net profit calculations.")
      refresh()
    } catch (err) { setFormError(err instanceof Error ? err.message : "Could not void expense") }
    finally { setBusy(false) }
  }

  return <div className="mx-auto flex max-w-7xl flex-col gap-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track delivery fuel, salaries, and other operating costs.</p></div>
      <Button onClick={() => { requestId.current = crypto.randomUUID(); setFormCategory("FUEL"); setFormError(""); setCreateOpen(true) }}>
        <Plus className="h-4 w-4" />Record Expense
      </Button>
    </div>
    {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
      {notice}<Button variant="ghost" size="sm" onClick={() => setNotice("")}>Dismiss</Button>
    </div>}
    <Card className="flex flex-wrap items-end gap-4 p-5">
      <DateRangePicker value={range} onChange={(dates) => { setRange(dates); setPage(0) }} />
      <Button variant="outline" onClick={() => { setRange(currentMonthRange()); setPage(0) }}>This Month</Button>
      <div className="space-y-1.5"><Label htmlFor="expense-category-filter">Expense category</Label>
        <Select id="expense-category-filter" value={category} onChange={(event) => { setCategory(event.target.value as ExpenseCategory | ""); setPage(0) }}>
          <option value="">All categories</option>
          {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>
    </Card>
    <ExpenseProfitPanel range={range} revision={revision} title="Profit for selected dates" />
    <p className="-mb-2 text-xs text-muted-foreground">Profit includes all expense categories for these dates. The category filter below applies to the expense list and breakdown.</p>
    <div className="grid gap-4 sm:grid-cols-3">
      {([
        ["Gasoline / Fuel", data?.summary.fuelAmount, Fuel],
        ["Delivery Salaries", data?.summary.salaryAmount, Banknote],
        ["Other Operating Costs", data?.summary.otherAmount, Wallet],
      ] as const).map(([label, amount, Icon]) => <Card key={label} className="p-5">
        <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary" /></div>
        <p className="mt-3 text-2xl font-bold">{loading ? "Loading…" : amount === undefined ? "—" : formatCurrency(amount)}</p>
      </Card>)}
    </div>
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4"><h3 className="font-semibold">Operating Expense History</h3>
        <p className="mt-1 text-xs text-muted-foreground">{data ? `${data.summary.recordedCount} recorded expenses · ${formatCurrency(data.summary.totalAmount)} in the selected category and dates` : "Recorded and voided expenses"}</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">
        <thead><tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          {["Date", "Category", "Description", "Paid To", "Amount", "Status", "Actions"].map((label) => <th key={label} className={cn("px-5 py-3 font-medium", label === "Amount" && "text-right")}>{label}</th>)}
        </tr></thead>
        <tbody>{loading ? <tr><td colSpan={7} className="px-5 py-8 text-center">Loading expenses…</td></tr>
          : loadError ? <tr><td colSpan={7} role="alert" className="px-5 py-8 text-center text-destructive">{loadError} <Button variant="outline" size="sm" onClick={refresh}>Retry</Button></td></tr>
          : !data?.records.content.length ? <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No expenses recorded for these dates and category.</td></tr>
          : data.records.content.map((expense) => <tr key={expense.id} className="border-b border-border align-top last:border-0">
            <td className="whitespace-nowrap px-5 py-4">{formatDate(expense.expenseDate)}</td>
            <td className="px-5 py-4">{CATEGORIES[expense.category]}</td>
            <td className="max-w-xs space-y-1 break-words px-5 py-4"><p className="font-medium">{expense.description}</p>
              {expense.notes && <p className="text-xs text-muted-foreground">{expense.notes}</p>}
              <p className="text-xs text-muted-foreground">Recorded by {expense.createdBy}</p>
              {expense.status === "VOIDED" && <p className="text-xs text-destructive">Voided by {expense.voidedBy}: {expense.voidReason}</p>}
            </td>
            <td className="px-5 py-4">{expense.paidTo || "—"}</td>
            <td className={cn("whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums", expense.status === "VOIDED" && "text-muted-foreground line-through")}>{formatCurrency(expense.amount)}</td>
            <td className="px-5 py-4"><Badge className={expense.status === "VOIDED" ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"}>{expense.status === "VOIDED" ? "Voided" : "Recorded"}</Badge></td>
            <td className="px-5 py-4"><Button variant="outline" size="sm" disabled={expense.status === "VOIDED"} onClick={() => { setFormError(""); setVoidTarget(expense) }}><Ban className="h-3.5 w-3.5" />Void</Button></td>
          </tr>)}</tbody>
      </table></div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>{data?.records.totalElements ?? 0} entries · Page {page + 1} of {Math.max(1, data?.records.totalPages ?? 0)}</span>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <Button size="sm" variant="outline" disabled={loading || page + 1 >= (data?.records.totalPages ?? 0)} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
      </div>
    </Card>
    <Modal isOpen={createOpen} title="Record Expense" onClose={() => { if (!busy) setCreateOpen(false) }}>
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        <div className="space-y-1"><Label htmlFor="expense-date">Date</Label><Input id="expense-date" name="expenseDate" type="date" required defaultValue={philippineToday()} /></div>
        <div className="space-y-1"><Label htmlFor="expense-category">Category</Label>
          <Select id="expense-category" value={formCategory} onChange={(event) => setFormCategory(event.target.value as ExpenseCategory)}>
            {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select></div>
        <div className="space-y-1"><Label htmlFor="expense-description">Description</Label><Input id="expense-description" name="description" maxLength={255} required placeholder={formCategory === "SALARY" ? "Delivery salary for October 12" : "Gasoline for LPG deliveries"} /></div>
        <div className="space-y-1"><Label htmlFor="expense-amount">Amount (₱)</Label><Input id="expense-amount" name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required placeholder="0.00" /></div>
        <div className="space-y-1"><Label htmlFor="expense-paid-to">{formCategory === "SALARY" ? "Delivery Person / Employee" : "Paid To (optional)"}</Label><Input id="expense-paid-to" name="paidTo" maxLength={255} required={formCategory === "SALARY"} placeholder={formCategory === "SALARY" ? "Employee name" : "Person or supplier"} /></div>
        <div className="space-y-1"><Label htmlFor="expense-notes">Notes (optional)</Label><textarea id="expense-notes" name="notes" rows={2} maxLength={500} className={textAreaClass} placeholder="Receipt number, delivery trip, or salary period" /></div>
        </fieldset>
        <p className="text-xs text-muted-foreground">This amount is deducted from profit in the month of the expense date.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Expense</Button></div>
      </form>
    </Modal>
    <Modal isOpen={voidTarget !== null} title="Void Expense" onClose={() => { if (!busy) setVoidTarget(null) }}>
      <form onSubmit={handleVoid} className="flex flex-col gap-4">
        <p className="text-sm">Void {voidTarget?.description} ({formatCurrency(voidTarget?.amount ?? 0)})? It will remain in history and stop reducing profit. To correct it, record a replacement expense afterward.</p>
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <div className="space-y-1"><Label htmlFor="expense-void-reason">Reason</Label><Input id="expense-void-reason" name="reason" required maxLength={500} placeholder="Explain why this expense is being voided" /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setVoidTarget(null)}>Cancel</Button>
          <Button type="submit" variant="destructive" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Void Expense</Button></div>
      </form>
    </Modal>
  </div>
}
