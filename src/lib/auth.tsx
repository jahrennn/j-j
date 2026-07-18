import { createContext, useContext, useState, type ReactNode } from "react"
import { login as apiLogin, logout as apiLogout, type LoginPayload } from "./api"

interface AuthState {
  username: string | null
  isAuthenticated: boolean
  signIn: (payload: LoginPayload) => Promise<void>
  signOut: () => void
  updateUsername: (username: string) => void
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
      JSON.stringify({ username: res.username }),
    )
  }

  async function signOut() {
    await apiLogout().catch(() => {})
    setUsername(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }

  function updateUsername(nextUsername: string) {
    setUsername(nextUsername)
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const session = JSON.parse(raw) as { username: string }
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...session, username: nextUsername }),
        )
      }
    } catch {
      // ignore malformed session
    }
  }

  return (
    <AuthContext.Provider
      value={{
        username,
        isAuthenticated: Boolean(username),
        signIn,
        signOut,
        updateUsername,
      }}
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
