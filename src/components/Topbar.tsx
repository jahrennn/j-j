import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, User, LogOut, ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/auth"

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { username, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleSignOut() {
    signOut()
    navigate("/login")
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground sm:text-lg">
          Jahren and John LPG Trading
        </h1>
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm hover:bg-muted"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </span>
          <span className="hidden font-medium text-foreground sm:inline">
            {username ?? "Admin"}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
            <div className="border-b border-border px-3 py-2">
              <p className="text-sm font-medium text-popover-foreground">
                {username ?? "Admin"}
              </p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
