import { usePrivacy, privateText } from "@/lib/privacy"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, User, LogOut, ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { PrivacyToggle } from "@/components/PrivacyToggle"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BrandLogo } from "@/components/BrandLogo"
import { BRAND_NAME } from "@/lib/brand"

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { privacyEnabled } = usePrivacy()
  const { username, role, signOut } = useAuth()
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
    <header className="border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            onClick={onMenu}
            className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo decorative className="h-9 w-9 rounded-lg bg-white p-0.5" />
          <h1 className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-lg" title={privacyEnabled ? "Business demo" : BRAND_NAME}>
            {privacyEnabled ? "Business demo" : BRAND_NAME}
          </h1>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1 sm:gap-2">
          <PrivacyToggle />
          <ThemeToggle />
          <div className="relative" ref={ref}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm hover:bg-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </span>
              <span className="hidden font-medium text-foreground sm:inline">
                {privateText(username ?? "Admin")}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-sm font-medium text-popover-foreground">
                    {privateText(username ?? "Admin")}
                  </p>
                  <p className="text-xs text-muted-foreground">{role === "OWNER" ? "Owner" : role === "CASHIER" ? "Cashier" : "Driver"}</p>
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
        </div>
      </div>

      {/* Demo Mode banner — appears when privacy mode is active */}
      {privacyEnabled && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 border-t border-amber-400/20 bg-amber-400/10 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-400/15 dark:bg-amber-400/5 dark:text-amber-400"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
          Demo Mode — prices, names &amp; addresses are hidden
        </div>
      )}
    </header>
  )
}
