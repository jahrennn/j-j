const STORAGE_KEY = "jjlpg.demo-privacy"
export const PRIVACY_MASK = "••••••"
const listeners = new Set<() => void>()
function readInitial() {
  try { return sessionStorage.getItem(STORAGE_KEY) === "true" } catch { return false }
}
let enabled = readInitial()
export const isPrivacyEnabled = () => enabled
export function setPrivacyEnabled(value: boolean) {
  enabled = value
  try { sessionStorage.setItem(STORAGE_KEY, String(value)) } catch { /* still works for this page */ }
  for (const listener of listeners) listener()
}
export function subscribePrivacy(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function privateText(value: unknown): string {
  return enabled ? PRIVACY_MASK : value == null ? "" : String(value)
}
export function requireVisibleDetails() {
  if (enabled) throw new Error("Reveal sensitive details before editing, printing, exporting, or copying messages.")
}
