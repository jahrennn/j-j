import { usePrivacy, privateText, requireVisibleDetails } from "@/lib/privacy"
import { useEffect, useState, type FormEvent } from "react"
import { Plus, Users } from "lucide-react"
import { Badge, Button, Card, Input, Label, Modal, Select } from "@/components/ui"
import { createStaff, getStaff, updateStaff, type StaffAccount, type StaffRole } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const access = [
  ["Owner", "All operations, stock and prices, costs and profit, staff accounts, and activity logs."],
  ["Cashier", "Record sales and utang, collect payments, view stock and tank exchanges, and edit promised dates."],
  ["Driver", "View stock and utang balances, prepare reminders, and record payment collections."],
]
export function StaffPage() {
  const { privacyEnabled } = usePrivacy()
  const { username } = useAuth()
  const [staff, setStaff] = useState<StaffAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<StaffAccount | null>(null)
  const [role, setRole] = useState<StaffRole>("CASHIER")
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [notice, setNotice] = useState("")
  async function load() {
    setLoading(true); setError("")
    try { setStaff(await getStaff()) } catch (e) { setError(e instanceof Error ? e.message : "Could not load staff") }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  function edit(account: StaffAccount | null) {
    setTarget(account); setRole(account?.role ?? "CASHIER"); setEnabled(account?.enabled ?? true); setSaveError(""); setOpen(true)
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (saving) return
    const form = new FormData(e.currentTarget)
    const password = String(form.get("password") || "")
    setSaving(true); setSaveError("")
    try {
      if (target) await updateStaff(target.id, { role, enabled, password: password || undefined })
      else await createStaff({ username: String(form.get("username")), password, role })
      setOpen(false); setNotice(target ? "Account updated. Existing sessions for this account must sign in again." : "Staff account created. Share the username and password directly with the staff member.")
      await load()
    } catch (e) { setSaveError(e instanceof Error ? e.message : "Could not save account") }
    finally { setSaving(false) }
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Staff accounts</h2><p className="mt-1 text-sm text-muted-foreground">Give each person their own login so actions are attributed correctly.</p></div><Button onClick={() => edit(null)}><Plus className="h-4 w-4" />Add staff</Button></div>
    <div className="grid gap-3 md:grid-cols-3">{access.map(([title, description]) => <Card key={title} className="p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{description}</p></Card>)}</div>
    {notice && <p role="status" className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error} <Button variant="outline" onClick={() => void load()}>Retry</Button></p>}
    <Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/40 text-left"><th className="p-4">Username</th><th className="p-4">Role</th><th className="p-4">Access</th><th className="p-4 text-right">Action</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={4} className="p-8 text-center">Loading staff…</td></tr> : staff.map(account => <tr key={account.id} className="border-b border-border last:border-0"><td className="p-4 font-medium"><Users className="mr-2 inline h-4 w-4" />{privateText(account.username)}{account.username === username && <span className="ml-2 text-xs text-muted-foreground">You</span>}</td><td className="p-4 capitalize">{account.role.toLowerCase()}</td><td className="p-4"><Badge className={account.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{account.enabled ? "Active" : "Disabled"}</Badge></td><td className="p-4 text-right"><Button variant="outline" size="sm" onClick={() => edit(account)}>Manage account</Button></td></tr>)}
    </tbody></table></Card>
    <Modal isOpen={open} onClose={() => { if (!saving) setOpen(false) }} title={target ? "Manage staff account" : "Add staff account"}>
      <form key={target?.id ?? "new"} onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
        <div className="space-y-1"><Label htmlFor="staffUsername">Username</Label><Input id="staffUsername" name="username" required pattern="[A-Za-z0-9._-]{3,100}" minLength={3} maxLength={100} defaultValue={target?.username} disabled={!!target} autoComplete="off" /><p className="text-xs text-muted-foreground">3–100 letters, numbers, dots, underscores or hyphens.</p></div>
        <div className="space-y-1"><Label htmlFor="staffRole">Role</Label><Select id="staffRole" value={role} onChange={e => setRole(e.target.value as StaffRole)} disabled={target?.username === username}><option value="OWNER">Owner</option><option value="CASHIER">Cashier</option><option value="DRIVER">Driver</option></Select></div>
        {target && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} disabled={target.username === username} />Account active</label>}
        <div className="space-y-1"><Label htmlFor="staffPassword">{target ? "Reset password (optional)" : "Initial password"}</Label><Input id="staffPassword" name="password" type="password" required={!target} minLength={8} maxLength={72} autoComplete="new-password" /><p className="text-xs text-muted-foreground">8–72 characters. Passwords are never displayed after saving.</p></div>
      </fieldset>{saveError && <p role="alert" className="text-sm text-destructive">{privateText(saveError)}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save account"}</Button></div></form>
    </Modal>
  </div>
}
