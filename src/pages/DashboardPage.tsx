import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  Flame,
  Cylinder,
  BarChart2,
  Loader2,
} from "lucide-react"
import { Badge, Button, Card } from "@/components/ui"
import {
  getDashboardAnalytics,
  getInventory,
  type DashboardAnalytics,
  type Product,
} from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

// ─── Colours ────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  "hsl(220 90% 56%)",   // blue
  "hsl(158 64% 52%)",   // green
  "hsl(38 92% 50%)",    // amber
  "hsl(280 68% 60%)",   // purple
  "hsl(0 72% 58%)",     // red
]

// ─── Custom tooltip ──────────────────────────────────────────────────────────
interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xl text-sm">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function OrdersTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xl text-sm">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      <span className="text-muted-foreground">Orders: </span>
      <span className="font-medium text-foreground">{payload[0].value}</span>
    </div>
  )
}

// ─── Skeleton shimmer ────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block animate-pulse rounded bg-muted", className)}
    />
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value?: string
  sub?: string
  icon: React.ElementType
  tint: string
}

function StatCard({ label, value, sub, icon: Icon, tint }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
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
        {value ?? <Skeleton className="h-7 w-28 align-middle" />}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      )}
    </Card>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function DashboardPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [inventory, setInventory] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDashboardAnalytics(),
      getInventory(),
    ]).then(([a, inv]) => {
      setAnalytics(a)
      setInventory(inv.products)
    }).finally(() => setLoading(false))
  }, [])

  const today = analytics?.todaySummary
  const week = analytics?.last7DaysSummary

  // Format daily labels as "Jul 17"
  const dailyData = analytics?.dailyRevenue.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    }),
  })) ?? []

  const lowStockProducts = inventory.filter((p) => p.stock < 20)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Analytics & overview of your LPG trading operations.
        </p>
      </div>

      {/* ── Today's KPIs ── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Today
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Revenue"
            value={today ? formatCurrency(today.totalRevenue) : undefined}
            icon={DollarSign}
            tint="bg-primary/10 text-primary"
          />
          <StatCard
            label="Profit"
            value={today ? formatCurrency(today.totalProfit) : undefined}
            icon={TrendingUp}
            tint="bg-success/15 text-success"
          />
          <StatCard
            label="Orders"
            value={today ? String(today.totalOrders) : undefined}
            icon={ShoppingCart}
            tint="bg-accent/15 text-accent"
          />
          <StatCard
            label="Avg. Transaction"
            value={today ? formatCurrency(today.averageTransactionValue) : undefined}
            icon={BarChart2}
            tint="bg-warning/15 text-warning"
          />
        </div>
      </section>

      {/* ── Last 7 Days KPIs ── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Last 7 Days
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Revenue"
            value={week ? formatCurrency(week.totalRevenue) : undefined}
            icon={DollarSign}
            tint="bg-primary/10 text-primary"
          />
          <StatCard
            label="Profit"
            value={week ? formatCurrency(week.totalProfit) : undefined}
            icon={TrendingUp}
            tint="bg-success/15 text-success"
          />
          <StatCard
            label="Orders"
            value={week ? String(week.totalOrders) : undefined}
            icon={ShoppingCart}
            tint="bg-accent/15 text-accent"
          />
          <StatCard
            label="Avg. Transaction"
            value={week ? formatCurrency(week.averageTransactionValue) : undefined}
            icon={BarChart2}
            tint="bg-warning/15 text-warning"
          />
        </div>
      </section>

      {/* ── Revenue & Profit Area Chart ── */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-semibold text-foreground">Revenue & Profit</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
              Profit
            </span>
          </div>
        </div>
        <div className="px-2 py-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(220 90% 56%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(220 90% 56%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(158 64% 52%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(158 64% 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 247 / 0.5)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "oklch(0.55 0.02 256)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tickFormatter={(v: number) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  tick={{ fontSize: 11, fill: "oklch(0.55 0.02 256)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="hsl(220 90% 56%)"
                  strokeWidth={2}
                  fill="url(#gradRevenue)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="hsl(158 64% 52%)"
                  strokeWidth={2}
                  fill="url(#gradProfit)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Product Breakdown Bar Chart */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-foreground">Sales by Product</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 30 days — by revenue</p>
            </div>
          </div>
          <div className="px-2 py-4">
            {loading ? (
              <div className="flex h-52 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={analytics?.productBreakdown ?? []}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 247 / 0.5)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 11, fill: "oklch(0.55 0.02 256)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "oklch(0.55 0.02 256)" }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    contentStyle={{
                      background: "white",
                      border: "1px solid oklch(0.91 0.01 247)",
                      borderRadius: "12px",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                    {(analytics?.productBreakdown ?? []).map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Inventory Snapshot */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">Inventory</h3>
            <Link to="/inventory">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Low stock alert */}
          {lowStockProducts.length > 0 && (
            <div className="border-b border-border bg-destructive/5 px-5 py-2.5 text-xs text-destructive font-medium">
              ⚠ {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} low on stock
            </div>
          )}

          <div className="divide-y divide-border">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : inventory.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No products yet</p>
            ) : (
              inventory.map((item) => {
                const low = item.stock < 20
                const Icon = item.type === "LPG Tank" ? Cylinder : Flame
                return (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          item.type === "LPG Tank" ? "text-primary" : "text-accent",
                        )}
                      />
                      <span className="text-sm text-foreground truncate max-w-[110px]">{item.name}</span>
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0",
                        low
                          ? "bg-destructive/10 text-destructive"
                          : "bg-success/15 text-success",
                      )}
                    >
                      {item.stock} left
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
