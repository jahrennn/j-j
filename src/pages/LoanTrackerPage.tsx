import { usePrivacy, privateText, requireVisibleDetails } from "@/lib/privacy"
import { useEffect, useState, useRef, FormEvent } from "react"
import {
  CreditCard,
  Loader2,
  Plus,
  HandCoins,
  Flame,
  Banknote,
  CheckCircle2,
  CalendarClock,
} from "lucide-react"
import { Badge, Button, Card, Modal, Label, Input, Select } from "@/components/ui"
import {
  getLoans,
  createOtherLoan,
  recordLoanPayment,
  type LoanRecord,
  updateLoanDueDate,
  getSettings,
} from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { dueStatus, daysOverdue, reminderMessage, type DueFilter } from "@/lib/utang"
import { cn, formatCurrency, formatDate, philippineToday } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-destructive/10 text-destructive",
  PARTIALLY_PAID: "bg-warning/15 text-warning-foreground",
  PAID: "bg-success/15 text-success",
}

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
}

export function LoanTrackerPage() {
  const { privacyEnabled } = usePrivacy()
  const { role } = useAuth()
  const canManageLoans = role !== "DRIVER"
  const [activeTab, setActiveTab] = useState<"LPG" | "OTHER" | "ALL">("LPG")
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dueFilter, setDueFilter] = useState<DueFilter>("ALL")
  const [search, setSearch] = useState("")
  const [today, setToday] = useState(philippineToday)
  const [dueTarget, setDueTarget] = useState<LoanRecord | null>(null)
  const [dueBusy, setDueBusy] = useState(false)
  const [dueError, setDueError] = useState("")
  const [reminderTarget, setReminderTarget] = useState<LoanRecord | null>(null)
  const [reminderBusy, setReminderBusy] = useState(false)
  const [reminderText, setReminderText] = useState("")
  const [reminderError, setReminderError] = useState("")
  const [reminderNotice, setReminderNotice] = useState("")
  const reminderVersion = useRef(0)

  const [loadError, setLoadError] = useState("")
  const [createError, setCreateError] = useState("")
  const fetchVersion = useRef(0)
  const paymentRequestId = useRef<string>("")

  // Create Other Loan modal
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Record Payment modal
  const [historyTarget, setHistoryTarget] = useState<LoanRecord | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payTarget, setPayTarget] = useState<LoanRecord | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [payError, setPayError] = useState("")

  // Toast notification
  const [toast, setToast] = useState<string | null>(null)

  async function fetchLoans() {
    const version = ++fetchVersion.current
    setLoading(true)
    setLoadError("")
    try {
      const data = await getLoans()
      if (version === fetchVersion.current) {
        setLoans(data)
        setToday(philippineToday())
      }
    } catch (err) {
      if (version === fetchVersion.current) {
        setLoans([])
        setLoadError(err instanceof Error ? err.message : "Failed to load loans")
      }
    } finally {
      if (version === fetchVersion.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoans()
    const timer = window.setInterval(() => setToday(philippineToday()), 60_000)
    const refresh = () => { if (document.visibilityState === "visible") void fetchLoans() }
    document.addEventListener("visibilitychange", refresh)
    return () => { fetchVersion.current++; reminderVersion.current++; window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh) }
  }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreateLoan = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isCreating) return
    setCreateError("")
    setIsCreating(true)
    try {
      const formData = new FormData(e.currentTarget)
      const result = await createOtherLoan({
        borrowerName: formData.get("borrowerName") as string,
        loanDate: (formData.get("loanDate") as string) || undefined,
        dueDate: (formData.get("dueDate") as string) || null,
        description: formData.get("description") as string,
        totalAmount: parseFloat(formData.get("totalAmount") as string),
        downpayment: parseFloat(formData.get("downpayment") as string) || 0,
        notes: (formData.get("notes") as string) || undefined,
      })
      setCreateOpen(false)
      fetchLoans()
      if (result.status === "PAID") showToast("Amount Fully Paid!")
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create loan")
    } finally {
      setIsCreating(false)
    }
  }

  const handleRecordPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!payTarget || isPaying) return
    setIsPaying(true)
    setPayError("")
    try {
      const formData = new FormData(e.currentTarget)
      const amount = parseFloat(formData.get("amount") as string)
      const result = await recordLoanPayment(payTarget.id, {
        requestId: paymentRequestId.current,
        amount,
        paymentDate: (formData.get("paymentDate") as string) || undefined,
        notes: (formData.get("notes") as string) || undefined,
      })
      setPayTarget(null)
      fetchLoans()
      if (result.status === "PAID") {
        showToast("Amount Fully Paid!")
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to record payment")
    } finally {
      setIsPaying(false)
    }
  }

  async function handleDueDate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dueTarget || dueBusy) return
    setDueBusy(true)
    setDueError("")
    try {
      const form = new FormData(e.currentTarget)
      await updateLoanDueDate(dueTarget.id, String(form.get("dueDate") || "") || null)
      setDueTarget(null)
      showToast("Promised payment date saved")
      void fetchLoans()
    } catch (err) { setDueError(err instanceof Error ? err.message : "Could not save promised date") }
    finally { setDueBusy(false) }
  }

  async function openReminder(loan: LoanRecord) {
    const version = ++reminderVersion.current
    setReminderTarget(loan)
    setReminderText("")
    setReminderNotice("")
    setReminderError("")
    setReminderBusy(true)
    try {
      const [currentLoans, settings] = await Promise.all([getLoans(loan.category), getSettings()])
      if (version !== reminderVersion.current) return
      const current = currentLoans.find(l => l.id === loan.id)
      if (!current || dueStatus(current) === "PAID") throw new Error("This loan is already settled or is no longer available. Refresh the list before preparing a reminder.")
      setReminderTarget(current)
      setReminderText(reminderMessage(current, settings.businessName, settings.contactNumber))
      setLoans(previous => previous.map(l => l.id === current.id ? current : l))
    } catch (err) { if (version === reminderVersion.current) setReminderError(err instanceof Error ? err.message : "Could not load the current balance") }
    finally { if (version === reminderVersion.current) setReminderBusy(false) }
  }

  async function copyReminder() {
    if (privacyEnabled) return
    setReminderError("")
    try {
      await navigator.clipboard.writeText(reminderText)
      setReminderNotice("Copied. Paste this message into SMS or Messenger when ready.")
    } catch { setReminderError("Clipboard access is unavailable. Select the message and copy it manually.") }
  }

  const categoryLoans = loans.filter(l => activeTab === "ALL" || l.category === activeTab)
  const overdueLoans = categoryLoans.filter(l => dueStatus(l, today) === "OVERDUE")
  const overdueBalance = overdueLoans.reduce((sum, l) => sum + l.remainingBalance, 0)
  const visibleLoans = categoryLoans.filter(l => (dueFilter === "ALL" || dueStatus(l, today) === dueFilter)
    && `${l.borrowerName} ${l.productPurchased ?? ""} ${l.description ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.id - a.id)
  const totalOutstanding = categoryLoans.reduce((sum, l) => sum + l.remainingBalance, 0)
  const totalLoans = categoryLoans.length
  const unpaidCount = categoryLoans.filter(l => l.status === "UNPAID").length
  const paidCount = categoryLoans.filter(l => l.status === "PAID").length

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div role="status" className="fixed right-6 top-20 z-[100] flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-success-foreground shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Loan Tracker
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track LPG sales on credit (Utang) and general loans.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === "OTHER" && canManageLoans && (
          <Button onClick={() => { setCreateError(""); setCreateOpen(true) }}>
            <Plus className="h-4 w-4" />
            Record Other Loan
          </Button>
        )}</div>
      </div>

      {loadError && <div role="alert" className="rounded-lg border border-destructive p-4 text-destructive">{privateText(loadError)} <Button variant="outline" onClick={fetchLoans}>Retry</Button></div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Loans</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted align-middle" />
            ) : (
              totalLoans
            )}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Banknote className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted align-middle" />
            ) : (
              formatCurrency(totalOutstanding)
            )}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Unpaid</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
              <HandCoins className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted align-middle" />
            ) : (
              unpaidCount
            )}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Fully Paid</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
              <CheckCircle2 className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted align-middle" />
            ) : (
              paidCount
            )}
          </p>
        </Card>
      </div>

      {!loading && !loadError && <Card className="flex flex-col gap-3 border-destructive/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold">{overdueLoans.length} overdue loan{overdueLoans.length === 1 ? "" : "s"} · {formatCurrency(overdueBalance)}</p>
          <p className="text-xs text-muted-foreground">Unpaid balances past their promised date. Dates follow Philippine time. Totals follow the selected category.</p></div>
        <Button variant="outline" onClick={() => { setDueFilter("OVERDUE"); setSearch("") }}>Show overdue</Button>
      </Card>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button className={cn("rounded-md px-4 py-2 text-sm font-medium", activeTab === "ALL" ? "bg-card shadow-sm" : "text-muted-foreground")} aria-pressed={activeTab === "ALL"} onClick={() => setActiveTab("ALL")}>All utang</button>
        <button
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "LPG"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={activeTab === "LPG"}
          onClick={() => setActiveTab("LPG")}
        >
          <Flame className="h-4 w-4" />
          LPG Loans
        </button>
        <button
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "OTHER"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={activeTab === "OTHER"}
          onClick={() => setActiveTab("OTHER")}
        >
          <Banknote className="h-4 w-4" />
          Other Loans
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input aria-label="Search loans" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, product or description…" className="sm:max-w-sm" />
        <Select aria-label="Filter by promised payment date" value={dueFilter} onChange={e => setDueFilter(e.target.value as DueFilter)} className="sm:w-56">
          <option value="ALL">All payment dates</option><option value="OVERDUE">Overdue</option><option value="TODAY">Due today</option><option value="UPCOMING">Upcoming</option><option value="UNDATED">No promised date</option>
        </Select>
        <Button variant="outline" onClick={() => void fetchLoans()} disabled={loading}>Refresh</Button>
      </div>

      {/* Table */}
      <Card>
        <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground lg:hidden">Scroll the table sideways to see dates and actions.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold text-muted-foreground">
                  Borrower / Loan date
                </th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold text-muted-foreground">
                  {activeTab === "LPG" ? "Product" : "Product / Description"}
                </th>
                <th className="whitespace-nowrap px-3 py-3.5 text-right font-semibold text-muted-foreground">
                  Total / Paid
                </th>
                <th className="whitespace-nowrap px-3 py-3.5 text-right font-semibold text-muted-foreground">
                  Balance
                </th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold text-muted-foreground">Promised date</th>
                <th className="whitespace-nowrap px-3 py-3.5 text-right font-semibold text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : visibleLoans.length > 0 ? (
                visibleLoans.map((loan) => (
                  <tr
                    key={loan.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground">
                      <span className="block max-w-40 truncate" title={privateText(loan.borrowerName)}>{privateText(loan.borrowerName)}</span>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">{formatDate(loan.loanDate)}</p>
                      {loan.notes && (
                        <div className="max-w-[180px] truncate text-[11px] text-muted-foreground" title={privateText(loan.notes)}>
                          {privateText(loan.notes)}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-3 text-foreground" title={loan.category === "LPG" ? loan.productPurchased : privateText(loan.description)}>
                      {loan.category === "LPG" ? loan.productPurchased || "-" : privateText(loan.description || "-")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(loan.totalAmount)}
                      <p className="mt-1 text-xs font-normal text-muted-foreground">Paid: {formatCurrency(loan.amountPaid)}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(loan.remainingBalance)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Badge className={cn("gap-1", STATUS_STYLES[loan.status] || "")}>
                        {STATUS_LABELS[loan.status] || loan.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <button disabled={!canManageLoans} className="text-left text-sm underline decoration-dotted underline-offset-4 hover:text-primary disabled:no-underline" onClick={() => { setDueError(""); setDueTarget(loan) }} aria-label={`Edit promised date for ${privateText(loan.borrowerName)}`}>
                        {loan.dueDate ? formatDate(loan.dueDate) : canManageLoans ? "Set promised date" : "No promised date"}
                      </button>
                      {dueStatus(loan, today) === "OVERDUE" && <p className="mt-1 text-xs font-medium text-destructive">{daysOverdue(loan, today)} day(s) overdue</p>}
                      {dueStatus(loan, today) === "TODAY" && <p className="mt-1 text-xs font-medium text-warning-foreground">Due today</p>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="grid w-44 grid-cols-2 gap-1.5">
                      <Button
                        className="col-span-2"
                        size="sm"
                        variant={loan.status === "PAID" ? "ghost" : "outline"}
                        disabled={loan.status === "PAID"}
                        onClick={() => {
                          setPayAmount("")
                          paymentRequestId.current = crypto.randomUUID()
                          setPayTarget(loan)
                          setPayError("")
                        }}
                      >
                        <HandCoins className="h-3.5 w-3.5" />
                        {loan.status === "PAID" ? "Settled" : "Record Payment"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setHistoryTarget(loan)}>History</Button>
                      <Button size="sm" variant="outline" disabled={loan.remainingBalance <= 0 || loan.status === "PAID"} onClick={() => void openReminder(loan)}>Reminder</Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-12 text-center text-muted-foreground"
                  >
                    {loadError ? "Unable to load records. Please retry." : "No loans match this category, date filter and search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={!!dueTarget} onClose={() => { if (!dueBusy) setDueTarget(null) }} title="Promised payment date">
        {dueTarget && <form key={dueTarget.id} onSubmit={handleDueDate} className="space-y-4">
          <p className="text-sm">{privateText(dueTarget.borrowerName)} · Balance: {formatCurrency(dueTarget.remainingBalance)}</p>
          <div className="space-y-1"><Label htmlFor="editDueDate">Promised payment date</Label><Input id="editDueDate" name="dueDate" type="date" min={dueTarget.loanDate} defaultValue={dueTarget.dueDate ?? ""} disabled={dueBusy} /></div>
          <p className="text-xs text-muted-foreground">Leave blank to remove the promised date. The date must be on or after {formatDate(dueTarget.loanDate)}.</p>
          {dueError && <p role="alert" className="text-sm text-destructive">{privateText(dueError)}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={dueBusy} onClick={() => setDueTarget(null)}>Cancel</Button><Button type="submit" disabled={dueBusy}><CalendarClock className="h-4 w-4" />{dueBusy ? "Saving…" : "Save date"}</Button></div>
        </form>}
      </Modal>

      <Modal isOpen={!!reminderTarget} onClose={() => { reminderVersion.current++; setReminderTarget(null) }} title="Payment reminder">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Review and edit this message, then copy it into SMS or Messenger.</p>
          {reminderBusy ? <p role="status" className="text-sm">Checking the latest balance…</p> : reminderText && <>
            <Label htmlFor="reminderMessage">Reminder message</Label>
            <textarea hidden={privacyEnabled} disabled={privacyEnabled} id="reminderMessage" className="min-h-56 w-full rounded-lg border border-input bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={reminderText} onChange={e => { setReminderText(e.target.value); setReminderNotice("") }} />
          </>}
          {privacyEnabled && reminderText && <p className="rounded-lg border border-border p-4 tracking-widest">••••••</p>}
          {reminderError && <p role="alert" className="text-sm text-destructive">{privateText(reminderError)}</p>}
          {reminderNotice && <p role="status" className="text-sm text-success">{privateText(reminderNotice)}</p>}
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => { reminderVersion.current++; setReminderTarget(null) }}>Close</Button><Button disabled={privacyEnabled || reminderBusy || !reminderText.trim()} onClick={() => void copyReminder()}>Copy message</Button></div>
        </div>
      </Modal>

      {/* Create Other Loan Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { if (!isCreating) setCreateOpen(false) }}
        title="Record Other Loan"
      >
        <form onSubmit={handleCreateLoan} className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label htmlFor="borrowerName">Borrower / Customer Name</Label>
            <Input id="borrowerName" name="borrowerName" required maxLength={255} placeholder="Enter borrower's name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="loanDate">Date</Label>
            <Input id="loanDate" name="loanDate" type="date" defaultValue={philippineToday()} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="loanDueDate">Promised payment date (optional)</Label>
            <Input id="loanDueDate" name="dueDate" type="date" />
            <p className="text-xs text-muted-foreground">Must be on or after the loan date.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description / Reason</Label>
            <Input id="description" name="description" required placeholder='e.g. "Cash Loan", "Store Items Credit"' />
          </div>
          <div className="space-y-1">
            <Label htmlFor="totalAmount">Total Loan Amount (₱)</Label>
            <Input id="totalAmount" name="totalAmount" type="number" min="0.01" step="0.01" required placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="loanDownpayment">Initial Downpayment (₱)</Label>
            <Input id="loanDownpayment" name="downpayment" type="number" min="0" step="0.01" defaultValue={0} placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="loanNotes">Notes / Remarks</Label>
            <Input id="loanNotes" name="notes" placeholder="Optional notes" />
          </div>

          {createError && <p role="alert" className="text-sm text-destructive">{privateText(createError)}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Loan"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!historyTarget} onClose={() => setHistoryTarget(null)} title="Loan Payment History">
        {historyTarget && <div className="space-y-3">
          <p className="font-medium">{privateText(historyTarget.borrowerName)}</p>
          <p className="text-sm">Total: {formatCurrency(historyTarget.totalAmount)} · Paid: {formatCurrency(historyTarget.amountPaid)} · Balance: {formatCurrency(historyTarget.remainingBalance)}</p>
          <p className="text-sm text-muted-foreground">{privateText(historyTarget.notes)}</p>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {historyTarget.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : historyTarget.payments.map(payment => (
              <div key={payment.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between"><span>{formatDate(payment.paymentDate)}</span><span className="font-semibold">{formatCurrency(payment.amount)}</span></div>
                <p className="mt-1 text-xs text-muted-foreground">Collected by: {privateText(payment.collectedBy ?? "Unknown (legacy)")}</p>
                {payment.notes && <p className="mt-1 text-muted-foreground">{privateText(payment.notes)}</p>}
              </div>
            ))}
          </div>
        </div>}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!payTarget}
        onClose={() => { if (!isPaying) setPayTarget(null) }}
        title="Record Payment"
      >
        {payTarget && (
          <form onSubmit={handleRecordPayment} className="flex flex-col gap-4">
            {/* Loan summary info */}
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Borrower</span>
                <span className="font-medium">{privateText(payTarget.borrowerName)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Loan</span>
                <span className="font-medium">{formatCurrency(payTarget.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-medium">{formatCurrency(payTarget.amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="font-medium text-foreground">Remaining Balance</span>
                <span className="font-bold text-destructive">{formatCurrency(payTarget.remainingBalance)}</span>
              </div>
            </div>

            {/* Payment history */}
            {payTarget.payments.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment History</p>
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border bg-card p-2 text-xs">
                  {payTarget.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{formatDate(p.paymentDate)}</span>
                      <span className="font-medium text-success">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="paymentAmount">Payment Amount (₱)</Label>
              <Input
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                id="paymentAmount"
                name="amount"
                type="number"
                min="0.01"
                max={payTarget.remainingBalance}
                step="0.01"
                required
                placeholder={`Max: ${payTarget.remainingBalance.toFixed(2)}`}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={philippineToday()} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Input id="paymentNotes" name="notes" placeholder="Optional payment notes" />
            </div>

            {payAmount && Number(payAmount) > 0 && Number(payAmount) <= payTarget.remainingBalance && (
              <p className="text-sm text-muted-foreground">
                After payment: paid {formatCurrency(payTarget.amountPaid + Number(payAmount))},
                balance {formatCurrency(Math.max(0, Math.round((payTarget.remainingBalance - Number(payAmount)) * 100) / 100))}
              </p>
            )}

            {payError && (
              <p className="text-xs text-destructive">{privateText(payError)}</p>
            )}

            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setPayTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPaying}>
                {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Payment"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
