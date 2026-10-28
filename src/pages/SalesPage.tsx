import { usePrivacy, privateText, requireVisibleDetails } from "@/lib/privacy"
import { useEffect, useState, FormEvent, useRef } from "react"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Printer,
  Loader2,
  Cylinder,
  Plus,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { Badge, Button, Card, Modal, Label, Input, Select } from "@/components/ui"
import { DateRangePicker } from "@/components/DateRangePicker"
import { ExpenseProfitPanel } from "@/components/ExpenseProfitPanel"
import { SaleReceipt, downloadSaleReceiptPng, printSaleReceipt } from "@/components/SaleReceipt"
import {
  getSales,
  getSettings,
  getInventory,
  createSale,
  deleteSale,
  type DateRange,
  type SalesResponse,
  type SaleRecord,
  type Product,
} from "@/lib/api"
import { cn, formatCurrency, formatDate, philippineToday } from "@/lib/utils"
import { useInventoryRefresh } from "@/lib/useInventoryRefresh"
import { ApiError, type CreateSalePayload } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { clearPendingSale, readPendingSale, savePendingSale } from "@/lib/pendingSale"
import { reportDateRange } from "@/lib/dateRanges"

function defaultRange(): DateRange {
  return reportDateRange("30D")
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
  const { privacyEnabled } = usePrivacy()
  const { username, isOwner = true } = useAuth()
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [data, setData] = useState<SalesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [profitRevision, setProfitRevision] = useState(0)
  const reportRequest = useRef(0)

  const [products, setProducts] = useState<Product[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [inventoryRefreshing, setInventoryRefreshing] = useState(false)
  const [inventoryError, setInventoryError] = useState("")
  const [saleNotice, setSaleNotice] = useState("")
  const [pendingSale, setPendingSale] = useState<CreateSalePayload | null>(() => readPendingSale(username))
  const productRequest = useRef(0)
  const saleBusy = useRef(false)
  const [recordSaleOpen, setRecordSaleOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState("Pick up")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [saleError, setSaleError] = useState("")
  const [downpayment, setDownpayment] = useState<number>(0)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [hasTankExchange, setHasTankExchange] = useState(false)
  const [customerTankId, setCustomerTankId] = useState("")
  const [businessName, setBusinessName] = useState("Jahren and John LPG Trading")
  const [printTarget, setPrintTarget] = useState<SaleRecord | null>(null)
  const [receiptError, setReceiptError] = useState("")
  const [receiptNotice, setReceiptNotice] = useState("")
  const [receiptBusy, setReceiptBusy] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)
  const isAndroid = /Android/i.test(navigator.userAgent)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SaleRecord | null>(null)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const fetchSales = async (refreshProfit = false) => {
    const request = ++reportRequest.current
    try {
      setLoading(true)
      setData(null)
      const res = await getSales(range)
      if (request !== reportRequest.current) return
      setData(res)
      if (refreshProfit) setProfitRevision((value) => value + 1)
    } catch (err) {
      console.error(err)
    } finally {
      if (request === reportRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSales()
    return () => { reportRequest.current++ }
  }, [range])

  const refreshProducts = async (background = false) => {
    const request = ++productRequest.current
    if (!background) setInventoryLoading(true)
    setInventoryRefreshing(true)
    try {
      const res = await getInventory()
      if (request !== productRequest.current) return
      setProducts(res.products)
      setInventoryError("")
      setSelectedProductId((current) => current ? (res.products.some((p) => p.id === current) ? current : "") : (res.products.find((p) => p.stock > 0)?.id ?? ""))
      setCustomerTankId((current) => current ? (res.products.some((p) => p.id === current) ? current : "") : (res.products[0]?.id ?? ""))
    } catch (err) {
      if (request === productRequest.current) setInventoryError(err instanceof Error ? err.message : "Could not refresh stock")
    } finally {
      if (request === productRequest.current) {
        setInventoryLoading(false)
        setInventoryRefreshing(false)
      }
    }
  }

  useEffect(() => {
    void refreshProducts()
    getSettings().then((res) => setBusinessName(res.businessName)).catch(console.error)
  }, [])

  useInventoryRefresh(() => {
    if (!saleBusy.current && !inventoryRefreshing) void refreshProducts(true)
  })

  const openSaleForm = () => {
    setSaleError("")
    setDeliveryMethod(pendingSale?.deliveryMethod ?? "Pick up")
    setPaymentMethod(pendingSale?.paymentMethod ?? "Cash")
    setDownpayment(pendingSale?.downpayment ?? 0)
    setHasTankExchange(!!pendingSale?.tankExchange)
    if (pendingSale) {
      setSelectedProductId(pendingSale.productId)
      setCustomerTankId(pendingSale.tankExchange?.customerTankProductId ?? "")
    }
    setRecordSaleOpen(true)
    void refreshProducts()
  }

  const openReceipt = (sale: SaleRecord) => {
    setReceiptError("")
    setReceiptNotice("")
    setPrintTarget(sale)
  }

  const handleBrowserPrint = () => {
    if (privacyEnabled) return
    if (!printTarget || !receiptRef.current) return
    setReceiptError("")
    setReceiptNotice("")
    if (!printSaleReceipt(receiptRef.current, printTarget.transactionId)) {
      setReceiptError("Your browser blocked the receipt window. Allow pop-ups for this site and try again.")
    }
  }

  const handleDownloadReceipt = async () => {
    if (privacyEnabled) return
    if (!printTarget || receiptBusy) return
    setReceiptBusy(true)
    setReceiptError("")
    setReceiptNotice("")
    try {
      await downloadSaleReceiptPng(printTarget, businessName)
      setReceiptNotice("PNG download started. On Android, find it in Files > Downloads and open it in your printer app.")
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : "Could not download the receipt image.")
    } finally {
      setReceiptBusy(false)
    }
  }

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
    if (saleBusy.current) return
    saleBusy.current = true
    // A read started before this sale must not replace its confirmed stock.
    ++productRequest.current
    setInventoryLoading(false)
    setInventoryRefreshing(false)
    setSaleError("")
    setIsSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      const productId = formData.get("productId") as string
      const quantity = parseInt(formData.get("quantity") as string, 10)
      const buyerName = formData.get("buyerName") as string
      const address = formData.get("address") as string || ""
      const selectedDeliveryMethod = formData.get("deliveryMethod") as string
      const selectedPaymentMethod = (formData.get("paymentMethod") as string) || "Cash"
      const dpValue = selectedPaymentMethod === "Utang" ? (parseFloat(formData.get("downpayment") as string) || 0) : 0

      const payload: CreateSalePayload = pendingSale ?? {
        requestId: crypto.randomUUID(),
        productId,
        quantity,
        buyerName,
        address,
        deliveryMethod: selectedDeliveryMethod,
        paymentMethod: selectedPaymentMethod,
        downpayment: dpValue,
        dueDate: selectedPaymentMethod === "Utang" ? (formData.get("dueDate") as string) || null : undefined,
        tankExchange: hasTankExchange ? {
          customerTankProductId: customerTankId,
          suppliedTankProductId: productId,
        } : undefined,
      }
      savePendingSale(username, payload)
      setPendingSale(payload)
      const sale = await createSale(payload)
      clearPendingSale(username)
      setPendingSale(null)
      const sku = products.find((product) => product.id === sale.productId)?.sku
      setSaleNotice(`${sale.transactionId} recorded: ${sale.quantity} × ${sale.productName}${sku ? ` (${sku})` : ""}. ${sale.remainingStock == null ? "Refresh Inventory to confirm current stock." : `Stock remaining after confirmation: ${sale.remainingStock}.`}`)
      if (sale.remainingStock != null && sale.productId) {
        setProducts((current) => current.map((product) => product.id === sale.productId ? { ...product, stock: sale.remainingStock! } : product))
      }
      setRecordSaleOpen(false)
      // reset form
      setDeliveryMethod("Pick up")
      setPaymentMethod("Cash")
      setDownpayment(0)
      setHasTankExchange(false)
      void fetchSales(true)
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : "Failed to record sale")
      // Only an initial validation rejection is a definite failure. A rejected
      // retry cannot establish whether an earlier attempt already committed.
      if (!pendingSale && err instanceof ApiError && err.status === 400) {
        clearPendingSale(username)
        setPendingSale(null)
      }
    } finally {
      saleBusy.current = false
      setIsSubmitting(false)
      void refreshProducts(true)
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
      void fetchSales(true)
      void refreshProducts()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete sale")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportCSV = () => {
    if (privacyEnabled || !data || data.records.length === 0) return

    const headers = ["Date", "Transaction ID", "Buyer Name", "Product", "Quantity", "Total Amount (PHP)", ...(isOwner ? ["Capital (PHP)", "Gross Profit (PHP)"] : []), "Address", "Recorded by"]
    const rows = data.records.map((r) => [
      r.date,
      r.transactionId,
      r.buyerName || "",
      r.productName,
      String(r.quantity),
      r.totalAmount.toFixed(2),
      ...(isOwner ? [(r.capital ?? 0).toFixed(2), (r.profit ?? 0).toFixed(2)] : []),
      r.address || "",
      r.recordedBy || "Unknown (legacy)",
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

  const selectedProduct = products.find((product) => product.id === selectedProductId)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sales Report
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review LPG tank sales across a selected date range.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={privacyEnabled || !data || data.records.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            disabled={privacyEnabled || loading || !data?.records.length}
            onClick={() => data?.records[0] && openReceipt(data.records[0])}
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
          <Button onClick={openSaleForm}>
            <Plus className="h-4 w-4" />
            {pendingSale ? "Confirm Pending Sale" : "Record Sale"}
          </Button>
        </div>
      </div>

      {saleNotice && <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
        <p>{saleNotice}</p><Button variant="ghost" size="sm" onClick={() => setSaleNotice("")}>Dismiss</Button>
      </div>}

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <DateRangePicker value={range} onChange={setRange} />
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {isOwner && <ExpenseProfitPanel range={range} revision={profitRevision} title="Profit after operating expenses" />}

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
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 text-right font-medium">Quantity</th>
                {isOwner && <th className="px-5 py-3 text-right font-medium">Capital</th>}
                <th className="px-5 py-3 text-right font-medium">Total Amount</th>
                {isOwner && <th className="px-5 py-3 text-right font-medium">Gross Profit</th>}
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isOwner ? 9 : 7} className="px-5 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading sales records...
                    </span>
                  </td>
                </tr>
              ) : data && data.records.length > 0 ? (
                data.records.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-foreground">
                        {formatDate(r.date)}
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {r.transactionId}
                        </div><p className="mt-1 text-[10px] text-muted-foreground">By {privateText(r.recordedBy ?? "Unknown (legacy)")}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-foreground">
                        {privateText(r.buyerName || "-")}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          className="gap-1.5 bg-primary/10 text-primary"
                        >
                          <Cylinder className="h-3.5 w-3.5" />
                          {r.productName}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-foreground max-w-[150px] truncate" title={privateText(r.address)}>
                        {privateText(r.address || "-")}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {r.quantity}
                      </td>
                      {isOwner && <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                        {formatCurrency(r.capital ?? 0)}
                      </td>}
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                        <div>{formatCurrency(r.totalAmount)}</div>
                        {(r.paymentMethod === "UTANG" || (r as any).paymentMethod === "Utang") && (
                          <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Utang {r.downpayment ? `(DP: ${formatCurrency(r.downpayment)})` : ""}
                          </span>
                        )}
                      </td>
                      {isOwner && <td className="px-5 py-3 text-right font-medium tabular-nums text-success">
                        {formatCurrency(r.profit ?? 0)}
                      </td>}
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={privacyEnabled}
                          aria-label={`Print receipt for ${r.transactionId}`}
                          title="Print receipt"
                          onClick={() => openReceipt(r)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {isOwner && <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${r.transactionId}`}
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={isOwner ? 9 : 7}
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

      <Modal
        isOpen={!!printTarget}
        onClose={() => setPrintTarget(null)}
        title="Print Sale Receipt"
      >
        {printTarget && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="receipt-sale">Select sale</Label>
              <Select
                id="receipt-sale"
                value={printTarget.id}
                onChange={(e) => {
                  const selected = data?.records.find((sale) => sale.id === e.target.value)
                  if (selected) openReceipt(selected)
                }}
              >
                {data?.records.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.date} · {sale.transactionId} · {sale.buyerName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="max-h-[55vh] overflow-auto rounded-lg border border-border bg-white py-3">
              <div ref={receiptRef}>
                {privacyEnabled ? <p className="p-5 text-center text-sm text-muted-foreground">Receipt details hidden in demo privacy mode</p> : <SaleReceipt sale={printTarget} businessName={businessName} />}
              </div>
            </div>
            {receiptError && <p role="alert" className="text-sm text-destructive">{privateText(receiptError)}</p>}
            {receiptNotice && <p role="status" className="text-sm text-success">{privateText(receiptNotice)}</p>}
            {isAndroid && (
              <p className="text-xs text-muted-foreground">
                Download the PNG, then open it from Files &gt; Downloads in your PT-210 printer app.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setPrintTarget(null)}>Cancel</Button>
              <Button variant="outline" onClick={isAndroid ? handleBrowserPrint : handleDownloadReceipt} disabled={privacyEnabled || receiptBusy}>
                {isAndroid ? <Printer className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {isAndroid ? "Browser Print" : "Download PNG"}
              </Button>
              <Button onClick={isAndroid ? handleDownloadReceipt : handleBrowserPrint} disabled={privacyEnabled || receiptBusy}>
                {isAndroid ? <Download className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
                {isAndroid ? "Download Image" : "Print Receipt"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Sale Modal */}
      <Modal
        isOpen={recordSaleOpen}
        onClose={() => {
          if (isSubmitting) return
          setRecordSaleOpen(false)
          setDeliveryMethod("Pick up")
        }}
        title="Record Sale"
      >
        <form onSubmit={handleRecordSale} className="flex flex-col gap-4">
          {pendingSale && !isSubmitting && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">This sale has not been confirmed. Retry the same sale to check whether it was saved; it will not deduct stock twice.</p>}
          {inventoryLoading && <p role="status" className="text-sm text-muted-foreground">Refreshing current stock…</p>}
          {inventoryError && <div role="alert" className="text-sm text-destructive">Stock could not be refreshed. Displayed quantities may be outdated. {privateText(inventoryError)} <Button type="button" variant="outline" size="sm" onClick={() => void refreshProducts()}>Refresh Stock</Button></div>}
          <fieldset disabled={isSubmitting || pendingSale !== null || inventoryLoading || !!inventoryError} className="flex min-w-0 flex-col gap-4">
          <div className="space-y-1">
            <Label htmlFor="saleBuyerName">Buyer Name</Label>
            <Input id="saleBuyerName" name="buyerName" required maxLength={255} defaultValue={pendingSale?.buyerName} placeholder="Enter buyer's name" />
          </div>

          <div className="space-y-1">
            <Label>Product</Label>
            <Select name="productId" required value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="" disabled>Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock === 0}>
                  {p.name} ({p.sku}) · Stock: {p.stock} - {formatCurrency(p.unitPrice)}
                </option>
              ))}
            </Select>
            {selectedProduct && (
              <p role="status" className="text-xs text-muted-foreground">
                Available stock for {selectedProduct.name} ({selectedProduct.sku}): {selectedProduct.stock}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input name="quantity" type="number" min="1" max={selectedProduct?.stock} step="1" required defaultValue={pendingSale?.quantity ?? 1} />
          </div>

          {selectedProductId && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={hasTankExchange} onChange={(e) => setHasTankExchange(e.target.checked)} />
                Customer is exchanging a tank
              </label>
              {hasTankExchange && <>
                <div className="space-y-1">
                  <Label>Customer's tank (received by store)</Label>
                  <Select value={customerTankId} onChange={(e) => setCustomerTankId(e.target.value)} required>
                    <option value="" disabled>Select customer's tank</option>
                    {products.map((product) =>
                      <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tank given to customer</Label>
                  <Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} required>
                    {products.map((product) =>
                      <option key={product.id} value={product.id} disabled={product.stock === 0}>
                        {product.name} ({product.sku}) · Stock: {product.stock}
                      </option>)}
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">The tank given is the product sold. Its stock decreases normally. The customer's tank is recorded but is not added to saleable stock.</p>
              </>}
            </div>
          )}

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



          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select
              name="paymentMethod"
              required
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value)
                if (e.target.value === "Cash") setDownpayment(0)
              }}
            >
              <option value="Cash">Cash</option>
              <option value="Utang">Utang (Credit / Loan)</option>
            </Select>
          </div>

          {deliveryMethod === "Deliver" && (
            <div className="space-y-1">
              <Label>Address</Label>
              <Input name="address" required maxLength={500} defaultValue={pendingSale?.address} placeholder="Enter delivery address" />
            </div>
          )}

          {paymentMethod === "Utang" && (
            <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="downpayment">Initial Downpayment (₱)</Label>
                <span className="text-[11px] text-muted-foreground">Optional (defaults to 0)</span>
              </div>
              <Input
                id="downpayment"
                name="downpayment"
                type="number"
                min="0"
                step="0.01"
                value={downpayment}
                onChange={(e) => setDownpayment(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <Label htmlFor="saleDueDate">Promised payment date (optional)</Label>
              <Input id="saleDueDate" name="dueDate" type="date" min={philippineToday()} defaultValue={pendingSale?.dueDate ?? ""} />
              <p className="text-[11px] text-muted-foreground">
                An entry will automatically be created in the <strong>Loan Tracker</strong> with the initial balance due.
              </p>
            </div>
          )}

          </fieldset>

          {saleError && <p role="alert" className="text-sm text-destructive">{privateText(saleError)}</p>}

          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => {
              setRecordSaleOpen(false)
              setDeliveryMethod("Pick up")
              setPaymentMethod("Cash")
              setDownpayment(0)
              setHasTankExchange(false)
            }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!pendingSale && (inventoryLoading || !!inventoryError || !products.some((p) => p.id === selectedProductId && p.stock > 0)))}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : pendingSale ? "Retry Same Sale" : "Record Sale"}
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
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium">{deleteTarget?.productName}</span>
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
            <Label htmlFor="deletePassword">Your Owner Password</Label>
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
              <p className="mt-1 text-xs text-destructive">{privateText(deleteError)}</p>
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
