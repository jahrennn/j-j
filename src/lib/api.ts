/**
 * API layer for the Spring Boot backend.
 *
 * Set VITE_API_BASE_URL in a `.env` file to point at your Spring Boot server,
 * e.g. VITE_API_BASE_URL=http://localhost:8080/api
 *
 * When no base URL is configured the layer falls back to local mock data so the
 * UI is fully usable during development. Replace `USE_MOCK` paths with real
 * fetch calls (already stubbed below) once your endpoints are live.
 */

export type ItemType = "LPG Refill" | "LPG Tank"

export interface SaleRecord {
  id: string
  date: string // ISO date string
  transactionId: string
  item: ItemType
  quantity: number
  totalAmount: number
}

export interface SalesSummary {
  totalRevenue: number
  totalOrders: number
  averageTransactionValue: number
}

export interface SalesResponse {
  summary: SalesSummary
  records: SaleRecord[]
}

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""
const USE_MOCK = API_BASE_URL === ""

/* -------------------------------------------------------------------------- */
/*                                  Mock data                                 */
/* -------------------------------------------------------------------------- */

const REFILL_PRICE = 950
const TANK_PRICE = 2800

function seededSales(): SaleRecord[] {
  const records: SaleRecord[] = []
  const today = new Date()
  for (let i = 0; i < 48; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - Math.floor(i / 2))
    const isTank = i % 5 === 0
    const item: ItemType = isTank ? "LPG Tank" : "LPG Refill"
    const quantity = isTank ? 1 + (i % 2) : 1 + (i % 4)
    const unit = isTank ? TANK_PRICE : REFILL_PRICE
    records.push({
      id: `sale-${i}`,
      date: d.toISOString().slice(0, 10),
      transactionId: `TXN-${String(10248 - i).padStart(5, "0")}`,
      item,
      quantity,
      totalAmount: unit * quantity,
    })
  }
  return records
}

const MOCK_SALES = seededSales()

function filterByRange(records: SaleRecord[], range?: DateRange): SaleRecord[] {
  if (!range?.startDate && !range?.endDate) return records
  return records.filter((r) => {
    if (range.startDate && r.date < range.startDate) return false
    if (range.endDate && r.date > range.endDate) return false
    return true
  })
}

function summarize(records: SaleRecord[]): SalesSummary {
  const totalRevenue = records.reduce((sum, r) => sum + r.totalAmount, 0)
  const totalOrders = records.length
  return {
    totalRevenue,
    totalOrders,
    averageTransactionValue: totalOrders ? totalRevenue / totalOrders : 0,
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Client                                   */
/* -------------------------------------------------------------------------- */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

/**
 * GET /sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Your Spring Boot controller should accept startDate and endDate query params.
 */
export async function getSales(range?: DateRange): Promise<SalesResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const records = filterByRange(MOCK_SALES, range)
    return { summary: summarize(records), records }
  }

  const params = new URLSearchParams()
  if (range?.startDate) params.set("startDate", range.startDate)
  if (range?.endDate) params.set("endDate", range.endDate)
  const query = params.toString()
  return request<SalesResponse>(`/sales${query ? `?${query}` : ""}`)
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  username: string
}

/**
 * POST /auth/login  { username, password }
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    if (payload.username === "admin" && payload.password === "admin123") {
      return { token: "mock-jwt-token", username: payload.username }
    }
    throw new Error("Invalid username or password.")
  }

  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
