import { useEffect, useState, useRef, FormEvent } from "react"
import {
  CreditCard,
  Loader2,
  Plus,
  HandCoins,
  Flame,
  Banknote,
  CheckCircle2,
} from "lucide-react"
import { Badge, Button, Card, Modal, Label, Input } from "@/components/ui"
import {
  getLoans,
  createOtherLoan,
  recordLoanPayment,
  type LoanRecord,
  type LoanCategory,
} from "@/lib/api"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

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
  const [activeTab, setActiveTab] = useState<"LPG" | "OTHER">("LPG")
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [loading, setLoading] = useState(true)

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
      const data = await getLoans(activeTab as LoanCategory)
      if (version === fetchVersion.current) setLoans(data)
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
    return () => { fetchVersion.current++ }
  }, [activeTab])

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

  // Summary stats
  const totalOutstanding = loans
    .filter((l) => l.status !== "PAID")
    .reduce((sum, l) => sum + l.remainingBalance, 0)
  const totalLoans = loans.length
  const unpaidCount = loans.filter((l) => l.status === "UNPAID").length
  const paidCount = loans.filter((l) => l.status === "PAID").length

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
        {activeTab === "OTHER" && (
          <Button onClick={() => { setCreateError(""); setCreateOpen(true) }}>
            <Plus className="h-4 w-4" />
            Record Other Loan
          </Button>
        )}
      </div>

      {loadError && <div role="alert" className="rounded-lg border border-destructive p-4 text-destructive">{loadError} <Button variant="outline" onClick={fetchLoans}>Retry</Button></div>}

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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "LPG"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
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
          onClick={() => setActiveTab("OTHER")}
        >
          <Banknote className="h-4 w-4" />
          Other Loans
        </button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="whitespace-nowrap px-5 py-3.5 font-semibold text-muted-foreground">
                  Borrower
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 font-semibold text-muted-foreground">
                  Date
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 font-semibold text-muted-foreground">
                  {activeTab === "LPG" ? "Items" : "Description"}
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-muted-foreground">
                  Total
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-muted-foreground">
                  Paid
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-muted-foreground">
                  Balance
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : loans.length > 0 ? (
                loans.map((loan) => (
                  <tr
                    key={loan.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-foreground">
                      {loan.borrowerName}
                      {loan.notes && (
                        <div className="max-w-[180px] truncate text-[11px] text-muted-foreground" title={loan.notes}>
                          {loan.notes}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-foreground">
                      {formatDate(loan.loanDate)}
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-foreground" title={activeTab === "LPG" ? loan.itemsPurchased : loan.description}>
                      {activeTab === "LPG" ? loan.itemsPurchased || "-" : loan.description || "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(loan.totalAmount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-foreground">
                      {formatCurrency(loan.amountPaid)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(loan.remainingBalance)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge className={cn("gap-1", STATUS_STYLES[loan.status] || "")}>
                        {STATUS_LABELS[loan.status] || loan.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <Button
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
                      <Button className="ml-2" size="sm" variant="ghost" onClick={() => setHistoryTarget(loan)}>History</Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    {loadError ? "Unable to load records. Please retry." : <>No {activeTab === "LPG" ? "LPG loan" : "general loan"} records found.</>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Other Loan Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { if (!isCreating) setCreateOpen(false) }}
        title="Record Other Loan"
      >
        <form onSubmit={handleCreateLoan} className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label htmlFor="borrowerName">Borrower / Customer Name</Label>
            <Input id="borrowerName" name="borrowerName" required placeholder="Enter borrower's name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="loanDate">Date</Label>
            <Input id="loanDate" name="loanDate" type="date" defaultValue={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())} />
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

          {createError && <p role="alert" className="text-sm text-destructive">{createError}</p>}
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
          <p className="font-medium">{historyTarget.borrowerName}</p>
          <p className="text-sm">Total: {formatCurrency(historyTarget.totalAmount)} · Paid: {formatCurrency(historyTarget.amountPaid)} · Balance: {formatCurrency(historyTarget.remainingBalance)}</p>
          <p className="text-sm text-muted-foreground">{historyTarget.notes}</p>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {historyTarget.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : historyTarget.payments.map(payment => (
              <div key={payment.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between"><span>{formatDate(payment.paymentDate)}</span><span className="font-semibold">{formatCurrency(payment.amount)}</span></div>
                {payment.notes && <p className="mt-1 text-muted-foreground">{payment.notes}</p>}
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
                <span className="font-medium">{payTarget.borrowerName}</span>
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
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())} />
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
              <p className="text-xs text-destructive">{payError}</p>
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
