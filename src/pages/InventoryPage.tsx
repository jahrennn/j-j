import { Flame, Cylinder, Package } from "lucide-react"
import { Badge, Card } from "@/components/ui"
import { cn, formatCurrency } from "@/lib/utils"

interface Product {
  name: string
  sku: string
  type: "LPG Refill" | "LPG Tank"
  stock: number
  unitPrice: number
}

const products: Product[] = [
  { name: "LPG Refill (11kg)", sku: "RF-11", type: "LPG Refill", stock: 142, unitPrice: 950 },
  { name: "LPG Refill (22kg)", sku: "RF-22", type: "LPG Refill", stock: 64, unitPrice: 1850 },
  { name: "LPG Tank (11kg)", sku: "TK-11", type: "LPG Tank", stock: 38, unitPrice: 2800 },
  { name: "LPG Tank (22kg)", sku: "TK-22", type: "LPG Tank", stock: 12, unitPrice: 4600 },
  { name: "LPG Tank (50kg)", sku: "TK-50", type: "LPG Tank", stock: 6, unitPrice: 9200 },
]

export function InventoryPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Inventory
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current stock levels for refills and tanks.
        </p>
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
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
