import { useSyncExternalStore } from "react"
import { isPrivacyEnabled, setPrivacyEnabled, subscribePrivacy } from "./privacyStore"
export { privateText, requireVisibleDetails, isPrivacyEnabled, PRIVACY_MASK } from "./privacyStore"
export function usePrivacy() {
  const privacyEnabled = useSyncExternalStore(subscribePrivacy, isPrivacyEnabled, () => false)
  return { privacyEnabled, togglePrivacy: () => setPrivacyEnabled(!isPrivacyEnabled()) }
}
