import { Eye, EyeOff } from "lucide-react"
import { usePrivacy } from "@/lib/privacy"

export function PrivacyToggle() {
  const { privacyEnabled, togglePrivacy } = usePrivacy()
  const label = privacyEnabled ? "Show sensitive information (Demo Mode ON)" : "Hide sensitive information (Demo Mode)"

  return (
    <div className="relative flex items-center">
      {/* "Demo Mode" pill — visible only when privacy is active */}
      {privacyEnabled && (
        <span
          className="mr-1.5 hidden animate-in fade-in slide-in-from-right-2 sm:inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400"
          aria-hidden="true"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
          Demo
        </span>
      )}

      <button
        type="button"
        onClick={togglePrivacy}
        aria-label={label}
        title={label}
        aria-pressed={privacyEnabled}
        className={[
          "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          privacyEnabled
            ? "border-amber-400/50 bg-amber-400/10 text-amber-600 shadow-[0_0_0_3px_rgba(251,191,36,0.15)] hover:bg-amber-400/20 dark:border-amber-400/40 dark:text-amber-400 dark:shadow-[0_0_0_3px_rgba(251,191,36,0.12)]"
            : "border-border bg-card text-muted-foreground hover:bg-muted",
        ].join(" ")}
      >
        {privacyEnabled
          ? <EyeOff className="h-[18px] w-[18px]" />
          : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  )
}
