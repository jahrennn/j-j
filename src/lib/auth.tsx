import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { login as apiLogin, logout as apiLogout, getCurrentUser, type LoginPayload, type StaffRole } from "./api"
import { homeForRole } from "./permissions"

interface AuthState {
  username: string | null
  role: StaffRole | null
  loading: boolean
  isOwner: boolean
  homePath: string
  isAuthenticated: boolean
  signIn: (payload: LoginPayload) => Promise<void>
  signOut: () => Promise<void>
  updateUsername: (username: string) => void
}
const AuthContext = createContext<AuthState | undefined>(undefined)
const STORAGE_KEY = "jjlpg.session"
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<StaffRole | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    async function refresh() {
      const storedSession = sessionStorage.getItem(STORAGE_KEY)
      if (!storedSession) { if (alive) setLoading(false); return }
      try {
        const user = await getCurrentUser()
        if (alive && sessionStorage.getItem(STORAGE_KEY) === storedSession) { setUsername(user.username); setRole(user.role) }
      } catch { if (alive && !sessionStorage.getItem(STORAGE_KEY)) { setUsername(null); setRole(null) } }
      finally { if (alive) setLoading(false) }
    }
    void refresh()
    const onFocus = () => { void refresh() }
    window.addEventListener("focus", onFocus)
    const timer = window.setInterval(onFocus, 60_000)
    return () => { alive = false; window.removeEventListener("focus", onFocus); window.clearInterval(timer) }
  }, [])
  async function signIn(payload: LoginPayload) {
    const res = await apiLogin(payload)
    if (!["OWNER", "CASHIER", "DRIVER"].includes(res.role)) throw new Error("Update the backend before using staff accounts.")
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ username: res.username, token: res.token }))
    setUsername(res.username); setRole(res.role); setLoading(false)
  }
  async function signOut() {
    await apiLogout().catch(() => {})
    sessionStorage.removeItem(STORAGE_KEY)
    setUsername(null); setRole(null)
  }
  function updateUsername(next: string) { setUsername(next) }
  return <AuthContext.Provider value={{ username, role, loading, isOwner: role === "OWNER", homePath: homeForRole(role),
    isAuthenticated: Boolean(username && role), signIn, signOut, updateUsername }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
