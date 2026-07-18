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
  itemName: string
  quantity: number
  totalAmount: number
  capital: number
  profit: number
  buyerName: string
  address: string
}

export interface SalesSummary {
  totalRevenue: number
  totalOrders: number
  averageTransactionValue: number
  totalProfit: number
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
  capital: number
}

export interface InventoryResponse {
  products: Product[]
}

export interface DailyRevenue {
  date: string
  revenue: number
  profit: number
  orders: number
}

export interface ProductBreakdown {
  name: string
  revenue: number
  orders: number
}

export interface DashboardAnalytics {
  todaySummary: SalesSummary
  last7DaysSummary: SalesSummary
  dailyRevenue: DailyRevenue[]   // last 30 days
  productBreakdown: ProductBreakdown[]
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
  { id: "1", name: "LPG Refill (11kg)", sku: "RF-11", type: "LPG Refill", stock: 142, unitPrice: 950, capital: 800 },
  { id: "2", name: "LPG Refill (22kg)", sku: "RF-22", type: "LPG Refill", stock: 64, unitPrice: 1850, capital: 1600 },
  { id: "3", name: "LPG Tank (11kg)", sku: "TK-11", type: "LPG Tank", stock: 38, unitPrice: 2800, capital: 2500 },
  { id: "4", name: "LPG Tank (22kg)", sku: "TK-22", type: "LPG Tank", stock: 12, unitPrice: 4600, capital: 4200 },
  { id: "5", name: "LPG Tank (50kg)", sku: "TK-50", type: "LPG Tank", stock: 6, unitPrice: 9200, capital: 8500 },
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
      capital: (unit - 100) * quantity,
      profit: 100 * quantity,
      buyerName: `Customer ${i}`,
      address: i % 3 === 0 ? "Pick up" : `123 Demo St, Address ${i}`
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
  const totalProfit = records.reduce((sum, r) => sum + r.profit, 0)
  const totalOrders = records.length
  return {
    totalRevenue,
    totalOrders,
    averageTransactionValue: totalOrders ? totalRevenue / totalOrders : 0,
    totalProfit,
  }
}

// Token is now managed by the browser via HttpOnly cookies

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

  // The browser automatically attaches the HttpOnly cookie for requests
  // as long as credentials: "include" is set.

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

  // 204 No Content or empty body — don't try to parse JSON
  const contentLength = res.headers.get("content-length")
  if (res.status === 204 || contentLength === "0") {
    return undefined as unknown as T
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
      return { token: "", username: payload.username }
    }
    throw new Error("Invalid username or password.")
  }

  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return
  }
  await request<void>("/auth/logout", {
    method: "POST",
  })
}

export async function createSale(payload: { productId: string; quantity: number; buyerName: string; address: string; deliveryMethod: string }): Promise<SaleRecord> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const product = MOCK_PRODUCTS.find(p => p.id === payload.productId)
    if (!product) throw new Error("Product not found")
    if (product.stock < payload.quantity) throw new Error("Insufficient stock")
    
    product.stock -= payload.quantity
    
    const address = payload.deliveryMethod === "Pick up" ? "Pick up" : (payload.address || "Unknown")

    const newSale: SaleRecord = {
      id: `sale-mock-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      transactionId: `TXN-${Math.floor(Math.random() * 100000)}`,
      item: product.type,
      itemName: product.name,
      quantity: payload.quantity,
      totalAmount: product.unitPrice * payload.quantity,
      capital: product.capital * payload.quantity,
      profit: (product.unitPrice - product.capital) * payload.quantity,
      buyerName: payload.buyerName,
      address: address
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

export async function restockProduct(productId: string, quantity: number, capital: number): Promise<Product> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const product = MOCK_PRODUCTS.find(p => p.id === productId)
    if (!product) throw new Error("Product not found")
    product.stock += quantity
    product.capital = capital
    return product
  }
  return request<Product>(`/inventory/products/${productId}/restock`, {
    method: "POST",
    body: JSON.stringify({ quantity, capital }),
  })
}

export async function deleteProduct(productId: string, password: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const index = MOCK_PRODUCTS.findIndex(p => p.id === productId)
    if (index !== -1) MOCK_PRODUCTS.splice(index, 1)
    return
  }
  await request<void>(`/inventory/products/${productId}`, {
    method: "DELETE",
    body: JSON.stringify({ password }),
  })
}

export async function deleteSale(saleId: string, password: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const index = MOCK_SALES.findIndex(s => s.id === saleId)
    if (index !== -1) MOCK_SALES.splice(index, 1)
    return
  }
  await request<void>(`/sales/${saleId}`, {
    method: "DELETE",
    body: JSON.stringify({ password }),
  })
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  function toLocalDateString(d: Date): string {
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().slice(0, 10)
  }

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const today = toLocalDateString(new Date())
    const d7ago = toLocalDateString(new Date(Date.now() - 6 * 86400000))
    const d30ago = toLocalDateString(new Date(Date.now() - 29 * 86400000))

    const todayRecords = filterByRange(MOCK_SALES, { startDate: today, endDate: today })
    const last7Records = filterByRange(MOCK_SALES, { startDate: d7ago, endDate: today })
    const last30Records = filterByRange(MOCK_SALES, { startDate: d30ago, endDate: today })

    // Daily revenue for last 30 days
    const dailyMap = new Map<string, DailyRevenue>()
    for (let i = 29; i >= 0; i--) {
      const d = toLocalDateString(new Date(Date.now() - i * 86400000))
      dailyMap.set(d, { date: d, revenue: 0, profit: 0, orders: 0 })
    }
    for (const r of last30Records) {
      const entry = dailyMap.get(r.date)
      if (entry) {
        entry.revenue += r.totalAmount
        entry.profit += r.profit
        entry.orders += 1
      }
    }

    // Product breakdown
    const prodMap = new Map<string, ProductBreakdown>()
    for (const r of last30Records) {
      const name = r.itemName || r.item
      const entry = prodMap.get(name) ?? { name, revenue: 0, orders: 0 }
      entry.revenue += r.totalAmount
      entry.orders += r.quantity
      prodMap.set(name, entry)
    }

    return {
      todaySummary: summarize(todayRecords),
      last7DaysSummary: summarize(last7Records),
      dailyRevenue: Array.from(dailyMap.values()),
      productBreakdown: Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue),
    }
  }

  // Real backend — fetch last 30 days of sales and compute analytics client-side
  const today = toLocalDateString(new Date())
  const d30ago = toLocalDateString(new Date(Date.now() - 29 * 86400000))
  const d7ago = toLocalDateString(new Date(Date.now() - 6 * 86400000))

  const [res30, resToday, res7] = await Promise.all([
    getSales({ startDate: d30ago, endDate: today }),
    getSales({ startDate: today, endDate: today }),
    getSales({ startDate: d7ago, endDate: today }),
  ])

  const dailyMap = new Map<string, DailyRevenue>()
  for (let i = 29; i >= 0; i--) {
    const d = toLocalDateString(new Date(Date.now() - i * 86400000))
    dailyMap.set(d, { date: d, revenue: 0, profit: 0, orders: 0 })
  }
  for (const r of res30.records) {
    const entry = dailyMap.get(r.date)
    if (entry) {
      entry.revenue += r.totalAmount
      entry.profit += r.profit
      entry.orders += 1
    }
  }

  const prodMap = new Map<string, ProductBreakdown>()
  for (const r of res30.records) {
    const name = r.itemName || r.item
    const entry = prodMap.get(name) ?? { name, revenue: 0, orders: 0 }
    entry.revenue += r.totalAmount
    entry.orders += r.quantity
    prodMap.set(name, entry)
  }

  return {
    todaySummary: resToday.summary,
    last7DaysSummary: res7.summary,
    dailyRevenue: Array.from(dailyMap.values()),
    productBreakdown: Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue),
  }
}
