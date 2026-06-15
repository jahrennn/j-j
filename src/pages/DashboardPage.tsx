import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  ArrowRight,
  Flame,
  Cylinder,
} from "lucide-react"
import { Badge, Button, Card } from "@/components/ui"
import { getSales, type SalesResponse } from "@/lib/api"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

const stats = [
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
    label: "Avg. Transaction",
    icon: TrendingUp,
    format: (v: number) => formatCurrency(v),
    tint: "bg-success/15 text-success",
  },
]

export function DashboardPage() {
  const [data, setData] = useState<SalesResponse | null>(null)

  useEffect(() => {
    getSales().then(setData)
  }, [])

  const inventory = [
    { name: "LPG Refill (11kg)", stock: 142, icon: Flame, tint: "text-accent" },
    { name: "LPG Tank (11kg)", stock: 38, icon: Cylinder, tint: "text-primary" },
    { name: "LPG Tank (22kg)", stock: 12, icon: Cylinder, tint: "text-primary" },
  ]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your LPG trading operations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ key, label, icon: Icon, format, tint }) => (
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
              {data ? (
                format(data.summary[key])
              ) : (
                <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted align-middle" />
              )}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent sales */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">Recent Sales</h3>
            <Link to="/sales">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(data?.records.slice(0, 5) ?? []).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      r.item === "LPG Tank"
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/15 text-accent",
                    )}
                  >
                    {r.item === "LPG Tank" ? (
                      <Cylinder className="h-4 w-4" />
                    ) : (
                      <Flame className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {r.item}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {r.transactionId} {"\u00B7"} {formatDate(r.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(r.totalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Qty {r.quantity}
                  </p>
                </div>
              </div>
            ))}
            {!data && (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                Loading recent sales...
              </div>
            )}
          </div>
        </Card>

        {/* Inventory snapshot */}
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">Inventory</h3>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {inventory.map((item) => {
              const low = item.stock < 20
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("h-5 w-5", item.tint)} />
                    <span className="text-sm text-foreground">{item.name}</span>
                  </div>
                  <Badge
                    className={cn(
                      low
                        ? "bg-destructive/10 text-destructive"
                        : "bg-success/15 text-success",
                    )}
                  >
                    {item.stock} in stock
                  </Badge>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
