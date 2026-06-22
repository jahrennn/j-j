import { useEffect, useState, FormEvent } from "react"
import { Flame, Cylinder, Package, Loader2, Plus, Edit2 } from "lucide-react"
import { Badge, Card, Button, Modal, Input, Label, Select } from "@/components/ui"
import { getInventory, createProduct, updateProduct, deleteProduct, type Product, type ItemType } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addProductOpen, setAddProductOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

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
      })
      setEditProduct(null)
      fetchInventory()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!editProduct) return
    if (!window.confirm(`Are you sure you want to delete ${editProduct.name}?`)) return
    
    setIsSubmitting(true)
    try {
      await deleteProduct(editProduct.id)
      setEditProduct(null)
      fetchInventory()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product")
    } finally {
      setIsSubmitting(false)
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
                <th className="px-5 py-3 text-right font-medium">Unit Price</th>
                <th className="px-5 py-3 text-right font-medium">Stock</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading inventory...
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-destructive">
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
                        <Button variant="ghost" size="icon" onClick={() => setEditProduct(p)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
            <Label>Unit Price (₱)</Label>
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
            <Label>Unit Price (₱)</Label>
            <Input
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={editProduct?.unitPrice || 0}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={isSubmitting}
            >
              Delete Product
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditProduct(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
