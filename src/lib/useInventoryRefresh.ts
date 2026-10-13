import { useEffect, useRef } from "react"

/** Refresh visible stock after returning to the app, and while another device is selling. */
export function useInventoryRefresh(refresh: () => void) {
  const callback = useRef(refresh)
  callback.current = refresh
  useEffect(() => {
    const run = () => { if (document.visibilityState === "visible") callback.current() }
    window.addEventListener("focus", run)
    window.addEventListener("online", run)
    window.addEventListener("pageshow", run)
    document.addEventListener("visibilitychange", run)
    const timer = window.setInterval(run, 30_000)
    return () => {
      window.removeEventListener("focus", run)
      window.removeEventListener("online", run)
      window.removeEventListener("pageshow", run)
      document.removeEventListener("visibilitychange", run)
      window.clearInterval(timer)
    }
  }, [])
}
