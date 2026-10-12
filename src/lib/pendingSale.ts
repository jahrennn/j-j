import type { CreateSalePayload } from "@/lib/api"

const key = (username: string | null) => `jjlpg.pending-sale:${encodeURIComponent(username ?? "")}`

export function readPendingSale(username: string | null): CreateSalePayload | null {
  try {
    const raw = sessionStorage.getItem(key(username))
    if (!raw) return null
    const sale = JSON.parse(raw) as CreateSalePayload
    return typeof sale.requestId === "string" && typeof sale.productId === "string"
      && typeof sale.buyerName === "string" && Number.isInteger(sale.quantity) && sale.quantity > 0 ? sale : null
  } catch { return null }
}

export function savePendingSale(username: string | null, sale: CreateSalePayload) {
  try { sessionStorage.setItem(key(username), JSON.stringify(sale)) }
  catch { throw new Error("Could not save the sale's retry information. Allow site storage before recording this sale.") }
}

export function clearPendingSale(username: string | null) {
  // A failed removal must not turn a successfully committed sale into a UI error.
  // A retained entry is harmless: confirming it returns the same sale again.
  try { sessionStorage.removeItem(key(username)) } catch { /* keep retry safe */ }
}
