import { useEffect, useState, FormEvent, useRef } from "react"
import { Cylinder, Package, Loader2, Plus, Edit2, Trash2, AlertTriangle, History, SlidersHorizontal } from "lucide-react"
import { Badge, Card, Button, Modal, Input, Label, Select } from "@/components/ui"
import { getInventory, getStockMovements, createProduct, updateProduct, updateStock, deleteProduct, restockProduct, type Product, type StockMovementPage } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addProductOpen, setAddProductOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const [restockProductTarget, setRestockProductTarget] = useState<Product | null>(null)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [adjustType, setAdjustType] = useState<"CORRECTION" | "DAMAGE">("CORRECTION")
  const [movementProductId, setMovementProductId] = useState("")
  const [movementPage, setMovementPage] = useState(0)
  const [movements, setMovements] = useState<StockMovementPage | null>(null)
  const [movementLoading, setMovementLoading] = useState(true)
  const [movementError, setMovementError] = useState<string | null>(null)

  // Delete modal state (separate from edit)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const res = await getInventory()
      setProducts(res.products)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchMovements = async () => {
    setMovementLoading(true)
    try {
      setMovements(await getStockMovements(movementProductId || undefined, movementPage))
      setMovementError(null)
    } catch (err) {
      setMovementError(err instanceof Error ? err.message : "Failed to load stock history.")
    } finally {
      setMovementLoading(false)
    }
  }

  useEffect(() => {
    fetchMovements()
  }, [movementProductId, movementPage])

  const refreshInventoryAndHistory = () => {
    fetchInventory()
    if (movementPage === 0) fetchMovements()
    else setMovementPage(0)
  }

  // Focus password input when delete modal opens
  useEffect(() => {
    if (deleteTarget) {
      setDeletePassword("")
      setDeleteError("")
      setTimeout(() => passwordInputRef.current?.focus(), 100)
    }
  }, [deleteTarget])

  const handleAddProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      await createProduct({
        sku: formData.get("sku") as string,
        name: formData.get("name") as string,
        stock: parseInt(formData.get("stock") as string, 10),
        unitPrice: parseFloat(formData.get("unitPrice") as string),
        capital: parseFloat(formData.get("capital") as string),
      })
      setAddProductOpen(false)
      refreshInventoryAndHistory()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editProduct) return
    setIsSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      await updateProduct(editProduct.id, {
        sku: formData.get("sku") as string,
        name: formData.get("name") as string,
        unitPrice: parseFloat(formData.get("unitPrice") as string),
        capital: parseFloat(formData.get("capital") as string),
      })
      setEditProduct(null)
      refreshInventoryAndHistory()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRestockProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!restockProductTarget) return
    setIsSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      await restockProduct(
        restockProductTarget.id,
        parseInt(formData.get("quantity") as string, 10),
        parseFloat(formData.get("capital") as string),
        formData.get("note") as string || ""
      )
      setRestockProductTarget(null)
      refreshInventoryAndHistory()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to restock product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdjustStock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!adjustProduct) return
    setIsSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      await updateStock(adjustProduct.id, parseInt(formData.get("stock") as string, 10),
        adjustType, (formData.get("reason") as string).trim())
      setAdjustProduct(null)
      refreshInventoryAndHistory()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to adjust stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError("")
    try {
      await deleteProduct(deleteTarget.id, deletePassword)
      setDeleteTarget(null)
      refreshInventoryAndHistory()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete product")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Inventory
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current stock levels for LPG tanks.
          </p>
        </div>
        <Button onClick={() => setAddProductOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 text-right font-medium">Capital</th>
                <th className="px-5 py-3 text-right font-medium">SRP</th>
                <th className="px-5 py-3 text-right font-medium">Stock</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading inventory...
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-destructive">
                    {error}
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const low = p.stock < 20
                  return (
                    <tr
                      key={p.sku}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
                          >
                            <Cylinder className="h-4 w-4" />
                          </span>
                          <span className="font-medium text-foreground">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {p.sku}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {formatCurrency(p.capital)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {formatCurrency(p.unitPrice)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {p.stock}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge
                          className={cn(
                            low
                              ? "bg-destructive/10 text-destructive"
                              : "bg-success/15 text-success",
                          )}
                        >
                          {low ? "Low stock" : "In stock"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setRestockProductTarget(p)}
                            title="Restock"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setEditProduct(p)}
                            title="Edit"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => { setAdjustType("CORRECTION"); setAdjustProduct(p) }}
                            title="Adjust stock"
                            aria-label={`Adjust stock for ${p.name}`}
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4" /> Stock Movement History</h3>
            <p className="mt-1 text-xs text-muted-foreground">History starts with the opening balance when this feature is deployed.</p>
          </div>
          <Select aria-label="Filter stock history by product" className="sm:w-64" value={movementProductId}
            onChange={(e) => { setMovementProductId(e.target.value); setMovementPage(0) }}>
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead><tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 text-right font-medium">Change</th>
              <th className="px-5 py-3 text-right font-medium">Stock</th>
              <th className="px-5 py-3 font-medium">Reason / Sale</th>
              <th className="px-5 py-3 font-medium">By</th>
            </tr></thead>
            <tbody>
              {movementLoading ? <tr><td colSpan={7} className="px-5 py-8 text-center">Loading history...</td></tr>
                : movementError ? <tr><td colSpan={7} className="px-5 py-8 text-center text-destructive">{movementError}</td></tr>
                : !movements?.content.length ? <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No stock movements found.</td></tr>
                : movements.content.map((movement) => (
                  <tr key={movement.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-5 py-3">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(movement.createdAt))}</td>
                    <td className="px-5 py-3"><div className="font-medium">{movement.productName}</div><div className="text-xs text-muted-foreground">{movement.productSku}</div></td>
                    <td className="px-5 py-3 capitalize">{movement.movementType.replace(/_/g, " ").toLowerCase()}</td>
                    <td className={cn("px-5 py-3 text-right font-semibold tabular-nums", movement.quantityChange < 0 ? "text-destructive" : "text-success")}>{movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{movement.stockBefore} → {movement.stockAfter}</td>
                    <td className="px-5 py-3">{movement.reason}</td>
                    <td className="px-5 py-3">{movement.actor}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>{movements?.totalElements ?? 0} movements · Page {movementPage + 1} of {Math.max(1, movements?.totalPages ?? 0)}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={movementPage === 0 || movementLoading} onClick={() => setMovementPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={movementLoading || movementPage + 1 >= (movements?.totalPages ?? 0)} onClick={() => setMovementPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      {/* Add Product Modal */}
      <Modal
        isOpen={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        title="Add Product"
      >
        <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required placeholder="e.g. Brand A Tank (11kg)" />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input name="sku" required placeholder="e.g. TK-A11" />
          </div>
          <div className="space-y-1">
            <Label>Initial Stock</Label>
            <Input name="stock" type="number" min="0" required defaultValue={0} />
          </div>
          <div className="space-y-1">
            <Label>Capital (₱)</Label>
            <Input name="capital" type="number" min="0" step="0.01" required defaultValue={0} />
          </div>
          <div className="space-y-1">
            <Label>SRP (₱)</Label>
            <Input name="unitPrice" type="number" min="0" step="0.01" required defaultValue={0} />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setAddProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="Edit Product"
      >
        <form onSubmit={handleEditProduct} className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required defaultValue={editProduct?.name || ""} />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input name="sku" required defaultValue={editProduct?.sku || ""} />
          </div>
          <p className="text-xs text-muted-foreground">Current stock: {editProduct?.stock}. Use Adjust stock to change quantity with a reason. Price changes affect future sales only.</p>
          <div className="space-y-1">
            <Label>Capital (₱)</Label>
            <Input
              name="capital"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={editProduct?.capital || 0}
            />
          </div>
          <div className="space-y-1">
            <Label>SRP (₱)</Label>
            <Input
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={editProduct?.unitPrice || 0}
            />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setEditProduct(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Restock Product Modal */}
      <Modal
        isOpen={!!restockProductTarget}
        onClose={() => setRestockProductTarget(null)}
        title="Restock Product"
      >
        <form onSubmit={handleRestockProduct} className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label>Quantity to Add</Label>
            <Input
              name="quantity"
              type="number"
              min="1"
              required
              defaultValue={0}
            />
          </div>
          <div className="space-y-1">
            <Label>New Capital (₱)</Label>
            <Input
              name="capital"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={restockProductTarget?.capital || 0}
            />
          </div>
          <div className="space-y-1">
            <Label>Restock note (optional)</Label>
            <Input name="note" maxLength={500} placeholder="Supplier or delivery reference" />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setRestockProductTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restock"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!adjustProduct} onClose={() => setAdjustProduct(null)} title="Adjust Stock">
        <form onSubmit={handleAdjustStock} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{adjustProduct?.name} currently has {adjustProduct?.stock} units.</p>
          <div className="space-y-1">
            <Label>Adjustment type</Label>
            <Select value={adjustType} onChange={(e) => setAdjustType(e.target.value as "CORRECTION" | "DAMAGE")}>
              <option value="CORRECTION">Stock count correction</option>
              <option value="DAMAGE">Damaged or lost stock</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>New stock count</Label>
            <Input name="stock" type="number" min="0" required defaultValue={adjustProduct?.stock} key={adjustProduct?.id} />
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Input name="reason" required maxLength={500} placeholder="Explain why the stock changed" />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setAdjustProduct(null)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>Save Adjustment</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Product Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
      >
        <form onSubmit={handleDeleteProduct} className="flex flex-col gap-4">
          {/* Warning banner */}
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">This action cannot be undone.</p>
              <p className="mt-0.5 text-destructive/80">
                You are about to permanently delete{" "}
                <span className="font-semibold">{deleteTarget?.name}</span>.
                Existing sales records will not be affected.
              </p>
            </div>
          </div>

          {/* Product details */}
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SKU</span>
              <span className="font-mono font-medium">{deleteTarget?.sku}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock</span>
              <span className="font-medium">{deleteTarget?.stock} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit Price</span>
              <span className="font-medium">{deleteTarget ? formatCurrency(deleteTarget.unitPrice) : ""}</span>
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <Label htmlFor="deleteProductPassword">Admin Password</Label>
            <Input
              id="deleteProductPassword"
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
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Product"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
