import { usePrivacy, privateText, requireVisibleDetails } from "@/lib/privacy"
import { useEffect, useState } from "react"
import { Button, Card } from "@/components/ui"
import { getAuditEvents, type AuditPage } from "@/lib/api"

export function ActivityPage() {
  const { privacyEnabled } = usePrivacy()
  const [page, setPage] = useState(0)
  const [data, setData] = useState<AuditPage | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let alive = true; setLoading(true); setError("")
    getAuditEvents(page).then(result => { if (alive) setData(result) }).catch(e => { if (alive) setError(e instanceof Error ? e.message : "Could not load activity") }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [page, revision])
  return <div className="mx-auto max-w-6xl space-y-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Activity log</h2><p className="mt-1 text-sm text-muted-foreground">Who changed prices or stock, recorded sales, collected payments, and managed staff.</p></div><Button variant="outline" disabled={loading} onClick={() => setRevision(r => r + 1)}>Refresh</Button></div>
    <p className="text-xs text-muted-foreground">New activity is recorded from this release onward. Earlier payment records show “Unknown (legacy)”. Times use Philippine time.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/40 text-left"><th className="p-4">When</th><th className="p-4">Staff</th><th className="p-4">Action</th><th className="p-4">Details</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={4} className="p-8 text-center">Loading activity…</td></tr> : !data?.content.length ? <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No recorded activity yet.</td></tr> : data.content.map(event => <tr key={event.id} className="border-b border-border align-top last:border-0"><td className="whitespace-nowrap p-4 text-xs">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(event.createdAt))}</td><td className="p-4 font-medium">{privateText(event.actor)}</td><td className="p-4 text-xs capitalize">{event.action.replace(/_/g, " ").toLowerCase()}</td><td className="min-w-64 p-4"><p>{privateText(event.details)}</p><p className="mt-1 text-xs text-muted-foreground">{event.entityType} #{event.entityId}</p></td></tr>)}
    </tbody></table></Card>
    <div className="flex items-center justify-between text-sm"><span>{data?.totalElements ?? 0} events</span><div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page + 1} of {Math.max(1, data?.totalPages ?? 0)}</span><Button variant="outline" size="sm" disabled={loading || page + 1 >= (data?.totalPages ?? 0)} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
  </div>
}
