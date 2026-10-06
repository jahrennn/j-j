import { useEffect, useState } from "react"
import { Button, Card } from "@/components/ui"
import { getTankExchanges, type TankExchangePage } from "@/lib/api"

export function TankExchangePage() {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<TankExchangePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    getTankExchanges(page).then((result) => {
      if (active) { setData(result); setError("") }
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load tank exchanges")
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tank Exchange Register</h2>
          <p className="mt-1 text-sm text-muted-foreground">See which tank each customer brought in and which tank they received.</p>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold">Recorded exchanges</h3>
          <p className="mt-1 text-xs text-muted-foreground">Returned customer tanks are tracked here but are not added to saleable stock.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead><tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Sale</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Customer brought</th>
              <th className="px-5 py-3 font-medium">Customer received</th>
              <th className="px-5 py-3 text-right font-medium">Tanks</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-5 py-8 text-center">Loading exchanges...</td></tr>
                : error ? <tr><td colSpan={6} role="alert" className="px-5 py-8 text-center text-destructive">{error}</td></tr>
                : !data?.content.length ? <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No tank exchanges recorded yet.</td></tr>
                : data.content.map((exchange) => <tr key={exchange.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-5 py-3">{exchange.date}</td>
                    <td className="px-5 py-3 font-medium">{exchange.transactionId}</td>
                    <td className="px-5 py-3">{exchange.buyerName}</td>
                    <td className="px-5 py-3"><div>{exchange.customerTankName}</div><div className="text-xs text-muted-foreground">{exchange.customerTankSku}</div></td>
                    <td className="px-5 py-3"><div>{exchange.suppliedTankName}</div><div className="text-xs text-muted-foreground">{exchange.suppliedTankSku}</div></td>
                    <td className="px-5 py-3 text-right tabular-nums">{exchange.quantity}</td>
                  </tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>{data?.totalElements ?? 0} exchanges · Page {page + 1} of {Math.max(1, data?.totalPages ?? 0)}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={loading || page + 1 >= (data?.totalPages ?? 0)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
