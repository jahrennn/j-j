import { useEffect, useRef } from "react"

/** Refresh visible stock after returning to the app, and while another device is selling. */
export function useInventoryRefresh(refresh: () => void) {
  const callback = useRef(refresh)
  callback.current = refresh
  useEffect(() => {
    const run = () => { if (document.visibilityState === "visible") callback.current() }
    window.addEventListener("focus", run)
    document.addEventListener("visibilitychange", run)
    const timer = window.setInterval(run, 30_000)
    return () => {
      window.removeEventListener("focus", run)
      document.removeEventListener("visibilitychange", run)
      window.clearInterval(timer)
    }
  }, [])
}
