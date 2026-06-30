import { useEffect, useState, FormEvent, useRef } from "react"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Printer,
  Loader2,
  Flame,
  Cylinder,
  Plus,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { Badge, Button, Card, Modal, Label, Input, Select } from "@/components/ui"
import { DateRangePicker } from "@/components/DateRangePicker"
import {
  getSales,
  getInventory,
  createSale,
  deleteSale,
  type DateRange,
  type SalesResponse,
  type SaleRecord,
  type Product,
} from "@/lib/api"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

function toLocalDateString(d: Date): string {
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

function defaultRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return {
    startDate: toLocalDateString(start),
    endDate: toLocalDateString(end),
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
  {
    key: "totalProfit" as const,
    label: "Total Profit",
    icon: DollarSign, // Or another icon like PiggyBank
    format: (v: number) => formatCurrency(v),
    tint: "bg-primary/10 text-primary",
  },
]

export function SalesPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [data, setData] = useState<SalesResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [products, setProducts] = useState<Product[]>([])
  const [recordSaleOpen, setRecordSaleOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState("Pick up")

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SaleRecord | null>(null)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const fetchSales = async () => {
    try {
      setLoading(true)
      const res = await getSales(range)
      setData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [range])

  useEffect(() => {
    getInventory().then((res) => setProducts(res.products)).catch(console.error)
  }, [])

  // Focus password input when delete modal opens
  useEffect(() => {
    if (deleteTarget) {
      setDeletePassword("")
      setDeleteError("")
      setTimeout(() => passwordInputRef.current?.focus(), 100)
    }
  }, [deleteTarget])

  const handleRecordSale = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      const productId = formData.get("productId") as string
      const quantity = parseInt(formData.get("quantity") as string, 10)
      const buyerName = formData.get("buyerName") as string
      const address = formData.get("address") as string || ""
      const selectedDeliveryMethod = formData.get("deliveryMethod") as string

      await createSale({ productId, quantity, buyerName, address, deliveryMethod: selectedDeliveryMethod })
      setRecordSaleOpen(false)
      // reset form
      setDeliveryMethod("Pick up")
      fetchSales()
      getInventory().then((res) => setProducts(res.products)).catch(console.error)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record sale")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSale = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError("")
    try {
      await deleteSale(deleteTarget.id, deletePassword)
      setDeleteTarget(null)
      fetchSales()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete sale")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportCSV = () => {
    if (!data || data.records.length === 0) return

    const headers = ["Date", "Transaction ID", "Buyer Name", "Item", "Quantity", "Total Amount (PHP)", "Capital (PHP)", "Profit (PHP)", "Address"]
    const rows = data.records.map((r) => [
      r.date,
      r.transactionId,
      r.buyerName || "",
      r.item,
      String(r.quantity),
      r.totalAmount.toFixed(2),
      r.capital.toFixed(2),
      r.profit.toFixed(2),
      r.address || "",
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `sales_${range.startDate}_to_${range.endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={!data || data.records.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
          <Button onClick={() => setRecordSaleOpen(true)}>
            <Plus className="h-4 w-4" />
            Record Sale
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <DateRangePicker value={range} onChange={setRange} />
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <th className="px-5 py-3 font-medium">Buyer</th>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 text-right font-medium">Quantity</th>
                <th className="px-5 py-3 text-right font-medium">Capital</th>
                <th className="px-5 py-3 text-right font-medium">Total Amount</th>
                <th className="px-5 py-3 text-right font-medium">Profit</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
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
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {r.transactionId}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-foreground">
                        {r.buyerName || "-"}
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
                          {r.itemName}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-foreground max-w-[150px] truncate" title={r.address}>
                        {r.address || "-"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {r.quantity}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                        {formatCurrency(r.capital)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                        {formatCurrency(r.totalAmount)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-success">
                        {formatCurrency(r.profit)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={9}
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

      {/* Record Sale Modal */}
      <Modal
        isOpen={recordSaleOpen}
        onClose={() => {
          setRecordSaleOpen(false)
          setDeliveryMethod("Pick up")
        }}
        title="Record Sale"
      >
        <form onSubmit={handleRecordSale} className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label>Buyer Name</Label>
            <Input name="buyerName" required placeholder="Enter buyer's name" />
          </div>

          <div className="space-y-1">
            <Label>Product</Label>
            <Select name="productId" required>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock === 0}>
                  {p.name} (Stock: {p.stock}) - {formatCurrency(p.unitPrice)}
                </option>
              ))}
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input name="quantity" type="number" min="1" required defaultValue={1} />
          </div>

          <div className="space-y-1">
            <Label>Delivery Method</Label>
            <Select 
              name="deliveryMethod" 
              required 
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value)}
            >
              <option value="Pick up">Pick up</option>
              <option value="Deliver">Deliver</option>
            </Select>
          </div>

          {deliveryMethod === "Deliver" && (
            <div className="space-y-1">
              <Label>Address</Label>
              <Input name="address" required placeholder="Enter delivery address" />
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => {
              setRecordSaleOpen(false)
              setDeliveryMethod("Pick up")
            }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Sale"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Sale Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Sale Record"
      >
        <form onSubmit={handleDeleteSale} className="flex flex-col gap-4">
          {/* Warning banner */}
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">This action cannot be undone.</p>
              <p className="mt-0.5 text-destructive/80">
                You are about to permanently delete transaction{" "}
                <span className="font-mono font-semibold">{deleteTarget?.transactionId}</span>.
              </p>
            </div>
          </div>

          {/* Sale details */}
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{deleteTarget ? formatDate(deleteTarget.date) : ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item</span>
              <span className="font-medium">{deleteTarget?.item}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">{deleteTarget?.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{deleteTarget ? formatCurrency(deleteTarget.totalAmount) : ""}</span>
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <Label htmlFor="deletePassword">Admin Password</Label>
            <Input
              id="deletePassword"
              ref={passwordInputRef}
              type="password"
              placeholder="Enter your password to confirm"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value)
                setDeleteError("")
              }}
              required
            />
            {deleteError && (
              <p className="mt-1 text-xs text-destructive">{deleteError}</p>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeleting || !deletePassword}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Record"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
