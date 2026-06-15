import { createContext, useContext, useState, type ReactNode } from "react"
import { login as apiLogin, type LoginPayload } from "./api"

interface AuthState {
  username: string | null
  isAuthenticated: boolean
  signIn: (payload: LoginPayload) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

const STORAGE_KEY = "jjlpg.session"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw).username as string) : null
    } catch {
      return null
    }
  })

  async function signIn(payload: LoginPayload) {
    const res = await apiLogin(payload)
    setUsername(res.username)
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ username: res.username, token: res.token }),
    )
  }

  function signOut() {
    setUsername(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider
      value={{ username, isAuthenticated: Boolean(username), signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
