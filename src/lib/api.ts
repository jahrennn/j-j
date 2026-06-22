/// <reference types="vite/client" />

/**
 * API layer for the Spring Boot backend.
 *
 * Set VITE_API_BASE_URL in a `.env` file to point at your Spring Boot server,
 * e.g. VITE_API_BASE_URL=http://localhost:8080/api
 *
 * When no base URL is configured the layer falls back to local mock data so the
 * UI is fully usable during development.
 */

export type ItemType = "LPG Refill" | "LPG Tank"

export interface SaleRecord {
  id: string
  date: string
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
  startDate: string
  endDate: string
}

export interface Product {
  id: string
  name: string
  sku: string
  type: ItemType
  stock: number
  unitPrice: number
}

export interface InventoryResponse {
  products: Product[]
}

export interface SettingsResponse {
  businessName: string
  contactNumber: string
  address: string
  username: string
}

export interface UpdateSettingsPayload {
  businessName: string
  contactNumber: string
  address: string
  username?: string
  newPassword?: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  username: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""
const USE_MOCK = API_BASE_URL === ""
const STORAGE_KEY = "jjlpg.session"

/* -------------------------------------------------------------------------- */
/*                                  Mock data                                 */
/* -------------------------------------------------------------------------- */

const REFILL_PRICE = 950
const TANK_PRICE = 2800

const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "LPG Refill (11kg)", sku: "RF-11", type: "LPG Refill", stock: 142, unitPrice: 950 },
  { id: "2", name: "LPG Refill (22kg)", sku: "RF-22", type: "LPG Refill", stock: 64, unitPrice: 1850 },
  { id: "3", name: "LPG Tank (11kg)", sku: "TK-11", type: "LPG Tank", stock: 38, unitPrice: 2800 },
  { id: "4", name: "LPG Tank (22kg)", sku: "TK-22", type: "LPG Tank", stock: 12, unitPrice: 4600 },
  { id: "5", name: "LPG Tank (50kg)", sku: "TK-50", type: "LPG Tank", stock: 6, unitPrice: 9200 },
]

const MOCK_SETTINGS: SettingsResponse = {
  businessName: "Jahren and John LPG Trading",
  contactNumber: "+63 900 000 0000",
  address: "123 Market St., Manila, PH",
  username: "admin",
}

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

function getStoredToken(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw).token as string) : null
  } catch {
    return null
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string; message?: string }
    return body.detail ?? body.message ?? res.statusText
  } catch {
    return res.statusText
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Client                                   */
/* -------------------------------------------------------------------------- */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set("Content-Type", "application/json")

  const token = getStoredToken()
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  })

  if (res.status === 401) {
    sessionStorage.removeItem(STORAGE_KEY)
    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
    throw new Error("Session expired. Please sign in again.")
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }

  return res.json() as Promise<T>
}

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

export async function getInventory(): Promise<InventoryResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return { products: MOCK_PRODUCTS }
  }
  return request<InventoryResponse>("/inventory")
}

export async function getSettings(): Promise<SettingsResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_SETTINGS
  }
  return request<SettingsResponse>("/settings")
}

export async function updateSettings(
  payload: UpdateSettingsPayload,
): Promise<SettingsResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    return {
      ...MOCK_SETTINGS,
      businessName: payload.businessName,
      contactNumber: payload.contactNumber,
      address: payload.address,
      username: payload.username ?? MOCK_SETTINGS.username,
    }
  }
  return request<SettingsResponse>("/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

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

export async function createSale(payload: { productId: string; quantity: number }): Promise<SaleRecord> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const product = MOCK_PRODUCTS.find(p => p.id === payload.productId)
    if (!product) throw new Error("Product not found")
    if (product.stock < payload.quantity) throw new Error("Insufficient stock")
    
    product.stock -= payload.quantity
    
    const newSale: SaleRecord = {
      id: `sale-mock-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      transactionId: `TXN-${Math.floor(Math.random() * 100000)}`,
      item: product.type,
      quantity: payload.quantity,
      totalAmount: product.unitPrice * payload.quantity
    }
    MOCK_SALES.unshift(newSale)
    return newSale
  }
  return request<SaleRecord>("/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function createProduct(payload: Omit<Product, "id">): Promise<Product> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const newProduct: Product = {
      ...payload,
      id: `prod-mock-${Date.now()}`
    }
    MOCK_PRODUCTS.push(newProduct)
    return newProduct
  }
  return request<Product>("/inventory/products", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateStock(productId: string, stock: number): Promise<Product> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const product = MOCK_PRODUCTS.find(p => p.id === productId)
    if (!product) throw new Error("Product not found")
    product.stock = stock
    return product
  }
  return request<Product>(`/inventory/products/${productId}/stock`, {
    method: "PUT",
    body: JSON.stringify({ stock }),
  })
}

export async function updateProduct(productId: string, payload: Omit<Product, "id">): Promise<Product> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const product = MOCK_PRODUCTS.find(p => p.id === productId)
    if (!product) throw new Error("Product not found")
    Object.assign(product, payload)
    return product
  }
  return request<Product>(`/inventory/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}
