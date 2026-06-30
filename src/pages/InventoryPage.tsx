import { useEffect, useState, FormEvent, useRef } from "react"
import { Flame, Cylinder, Package, Loader2, Plus, Edit2, Trash2, AlertTriangle } from "lucide-react"
import { Badge, Card, Button, Modal, Input, Label, Select } from "@/components/ui"
import { getInventory, createProduct, updateProduct, deleteProduct, restockProduct, type Product, type ItemType } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addProductOpen, setAddProductOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const [restockProductTarget, setRestockProductTarget] = useState<Product | null>(null)

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
        type: formData.get("type") as ItemType,
        stock: parseInt(formData.get("stock") as string, 10),
        unitPrice: parseFloat(formData.get("unitPrice") as string),
        capital: parseFloat(formData.get("capital") as string),
      })
      setAddProductOpen(false)
      fetchInventory()
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
        type: formData.get("type") as ItemType,
        stock: parseInt(formData.get("stock") as string, 10),
        unitPrice: parseFloat(formData.get("unitPrice") as string),
        capital: parseFloat(formData.get("capital") as string),
      })
      setEditProduct(null)
      fetchInventory()
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
        parseFloat(formData.get("capital") as string)
      )
      setRestockProductTarget(null)
      fetchInventory()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to restock product")
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
      fetchInventory()
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
            Current stock levels for refills and tanks.
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
                  const isTank = p.type === "LPG Tank"
                  return (
                    <tr
                      key={p.sku}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg",
                              isTank
                                ? "bg-primary/10 text-primary"
                                : "bg-accent/15 text-accent",
                            )}
                          >
                            {isTank ? (
                              <Cylinder className="h-4 w-4" />
                            ) : (
                              <Flame className="h-4 w-4" />
                            )}
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
                          >
                            <Edit2 className="h-4 w-4" />
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

      {/* Add Product Modal */}
      <Modal
        isOpen={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        title="Add Product"
      >
        <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required placeholder="e.g. LPG Refill (11kg)" />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input name="sku" required placeholder="e.g. RF-11" />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select name="type" required defaultValue="LPG Refill">
              <option value="LPG Refill">LPG Refill</option>
              <option value="LPG Tank">LPG Tank</option>
            </Select>
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
          <div className="space-y-1">
            <Label>Type</Label>
            <Select name="type" required defaultValue={editProduct?.type || "LPG Refill"}>
              <option value="LPG Refill">LPG Refill</option>
              <option value="LPG Tank">LPG Tank</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Stock</Label>
            <Input
              name="stock"
              type="number"
              min="0"
              required
              defaultValue={editProduct?.stock || 0}
            />
          </div>
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
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{deleteTarget?.type}</span>
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
