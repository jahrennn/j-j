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

export interface SaleRecord {
  id: string
  date: string
  transactionId: string
  productName: string
  quantity: number
  totalAmount: number
  capital: number
  profit: number
  buyerName: string
  address: string
  deliveryMethod?: string
  paymentMethod?: string
  downpayment?: number
}

type SaleApiRecord = Omit<SaleRecord, "productName"> & { productName?: string; itemName?: string }

function normalizeSale(record: SaleApiRecord): SaleRecord {
  return { ...record, productName: record.productName ?? record.itemName ?? "" }
}

export interface TankExchangeRecord {
  id: number
  saleId: string
  transactionId: string
  date: string
  buyerName: string
  quantity: number
  customerTankName: string
  customerTankSku: string
  suppliedTankName: string
  suppliedTankSku: string
  createdAt: string
}

export interface TankExchangePage {
  content: TankExchangeRecord[]
  number: number
  totalPages: number
  totalElements: number
}

export type LoanCategory = "LPG" | "OTHER"
export type LoanStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID"

export interface LoanPayment {
  id: number
  amount: number
  paymentDate: string
  notes?: string
  createdAt?: string
}

export interface LoanRecord {
  id: number
  category: LoanCategory
  borrowerName: string
  loanDate: string
  description?: string
  productPurchased?: string
  totalAmount: number
  amountPaid: number
  remainingBalance: number
  status: LoanStatus
  notes?: string
  saleId?: number
  payments: LoanPayment[]
}

type LoanApiRecord = Omit<LoanRecord, "productPurchased"> & { productPurchased?: string; itemsPurchased?: string }

function normalizeLoan(record: LoanApiRecord): LoanRecord {
  return { ...record, productPurchased: record.productPurchased ?? record.itemsPurchased }
}

export interface CreateLoanPayload {
  borrowerName: string
  loanDate?: string
  description: string
  totalAmount: number
  downpayment?: number
  notes?: string
}

export interface RecordPaymentPayload {
  requestId?: string
  amount: number
  paymentDate?: string
  notes?: string
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
  stock: number
  unitPrice: number
  capital: number
}

export type StockMovementType = "OPENING" | "SALE" | "SALE_REVERSAL" | "RESTOCK" | "CORRECTION" | "DAMAGE" | "PRODUCT_DELETED"

export interface StockMovement {
  id: number
  productId: number | null
  productSku: string
  productName: string
  movementType: StockMovementType
  quantityChange: number
  stockBefore: number
  stockAfter: number
  reason: string
  actor: string
  transactionId: string | null
  createdAt: string
}

export interface StockMovementPage {
  content: StockMovement[]
  number: number
  totalPages: number
  totalElements: number
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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "")
const USE_MOCK = import.meta.env.DEV && API_BASE_URL === ""
const STORAGE_KEY = "jjlpg.session"

/* -------------------------------------------------------------------------- */
/*                                  Mock data                                 */
/* -------------------------------------------------------------------------- */

const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "Brand A Tank (11kg)", sku: "TK-A11", stock: 142, unitPrice: 950, capital: 800 },
  { id: "2", name: "Brand B Tank (22kg)", sku: "TK-B22", stock: 64, unitPrice: 1850, capital: 1600 },
  { id: "3", name: "Brand C Tank (11kg)", sku: "TK-C11", stock: 38, unitPrice: 2800, capital: 2500 },
  { id: "4", name: "Brand D Tank (22kg)", sku: "TK-D22", stock: 12, unitPrice: 4600, capital: 4200 },
  { id: "5", name: "Brand E Tank (50kg)", sku: "TK-E50", stock: 6, unitPrice: 9200, capital: 8500 },
]

let nextMockMovementId = 1
const MOCK_MOVEMENTS: StockMovement[] = MOCK_PRODUCTS.map((product) => ({
  id: nextMockMovementId++, productId: Number(product.id), productSku: product.sku,
  productName: product.name, movementType: "OPENING", quantityChange: product.stock,
  stockBefore: 0, stockAfter: product.stock, reason: "Opening balance when stock history was enabled",
  actor: "system", transactionId: null, createdAt: new Date().toISOString(),
}))

function recordMockMovement(product: Product, movementType: StockMovementType,
                            stockBefore: number, reason: string, transactionId: string | null = null) {
  MOCK_MOVEMENTS.unshift({
    id: nextMockMovementId++, productId: Number(product.id) || null, productSku: product.sku,
    productName: product.name, movementType, quantityChange: product.stock - stockBefore,
    stockBefore, stockAfter: product.stock, reason, actor: "admin", transactionId,
    createdAt: new Date().toISOString(),
  })
}

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
    const product = MOCK_PRODUCTS[i % MOCK_PRODUCTS.length]
    const quantity = 1 + (i % 4)
    records.push({
      id: `sale-${i}`,
      date: d.toISOString().slice(0, 10),
      transactionId: `TXN-${String(10248 - i).padStart(5, "0")}`,
      productName: product.name,
      quantity,
      totalAmount: product.unitPrice * quantity,
      capital: product.capital * quantity,
      profit: (product.unitPrice - product.capital) * quantity,
      buyerName: `Customer ${i}`,
      address: i % 3 === 0 ? "Pick up" : `123 Demo St, Address ${i}`,
      deliveryMethod: i % 3 === 0 ? "Pick up" : "Deliver",
      paymentMethod: "CASH",
      downpayment: 0
    })
  }
  return records
}

const MOCK_SALES = seededSales()
const MOCK_TANK_EXCHANGES: TankExchangeRecord[] = []

const MOCK_LOANS: LoanRecord[] = [
  {
    id: 1,
    category: "LPG",
    borrowerName: "Juan Dela Cruz",
    loanDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    description: "LPG Sale - TXN-10201",
    productPurchased: "Brand A Tank (11kg) (2x)",
    totalAmount: 1900,
    amountPaid: 500,
    remainingBalance: 1400,
    status: "PARTIALLY_PAID",
    notes: "Will pay balance on Friday",
    payments: [
      { id: 101, amount: 500, paymentDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), notes: "Initial Downpayment" }
    ]
  },
  {
    id: 2,
    category: "LPG",
    borrowerName: "Maria Santos",
    loanDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
    description: "LPG Sale - TXN-10202",
    productPurchased: "Brand C Tank (11kg) (1x)",
    totalAmount: 2800,
    amountPaid: 0,
    remainingBalance: 2800,
    status: "UNPAID",
    notes: "Neighbor, promised end of month",
    payments: []
  },
  {
    id: 3,
    category: "OTHER",
    borrowerName: "Pedro Penduko",
    loanDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    description: "Cash Loan / Emergency Expense",
    totalAmount: 1500,
    amountPaid: 1500,
    remainingBalance: 0,
    status: "PAID",
    notes: "Paid in full via GCash",
    payments: [
      { id: 102, amount: 500, paymentDate: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10), notes: "Partial cash payment" },
      { id: 103, amount: 1000, paymentDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), notes: "Full payment settlement" }
    ]
  },
  {
    id: 4,
    category: "OTHER",
    borrowerName: "Aling Nena's Sari-Sari",
    loanDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    description: "Store items credit & delivery fee",
    totalAmount: 850,
    amountPaid: 0,
    remainingBalance: 850,
    status: "UNPAID",
    notes: "Collect on weekend",
    payments: []
  }
]

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

  // Attach JWT as Bearer token (works universally on all browsers/devices)
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const session = JSON.parse(raw) as { token?: string }
      if (session.token) {
        headers.set("Authorization", `Bearer ${session.token}`)
      }
    }
  } catch {
    // ignore
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000) // 90 second timeout

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
    signal: controller.signal,
  }).catch((err) => {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The server is taking too long to respond. It may be waking up — please try again in a moment.")
    }
    if (err instanceof TypeError) {
      throw new Error("Could not connect to the server. Check your connection, then try again. If the app has been idle, the server may need about a minute to wake up.")
    }
    throw err
  })
  clearTimeout(timeoutId)

  if (res.status === 401) {
    if (path === "/auth/login") {
      throw new Error("Invalid username or password.")
    }
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
  const response = await request<SalesResponse & { records: SaleApiRecord[] }>(`/sales${query ? `?${query}` : ""}`)
  return { ...response, records: response.records.map(normalizeSale) }
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

export async function createSale(payload: {
  productId: string
  quantity: number
  buyerName: string
  address: string
  deliveryMethod: string
  paymentMethod?: string
  downpayment?: number
  tankExchange?: { customerTankProductId: string; suppliedTankProductId: string }
}): Promise<SaleRecord> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const product = MOCK_PRODUCTS.find(p => p.id === payload.productId)
    if (!product) throw new Error("Product not found")
    const customerTank = payload.tankExchange
      ? MOCK_PRODUCTS.find(p => p.id === payload.tankExchange?.customerTankProductId) : undefined
    if (payload.tankExchange && (payload.tankExchange.suppliedTankProductId !== product.id || !customerTank)) {
      throw new Error("A tank exchange requires two current inventory products; the supplied tank must be the product sold")
    }
    if (product.stock < payload.quantity) throw new Error("Insufficient stock")
    
    const stockBefore = product.stock
    product.stock -= payload.quantity
    
    const address = payload.deliveryMethod === "Pick up" ? "Pick up" : (payload.address || "Unknown")
    const isUtang = payload.paymentMethod === "Utang" || payload.paymentMethod === "UTANG"
    const totalAmount = product.unitPrice * payload.quantity
    const downpayment = isUtang ? (payload.downpayment ?? 0) : 0

    const newSale: SaleRecord = {
      id: `sale-mock-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      transactionId: `TXN-${Math.floor(Math.random() * 100000)}`,
      productName: product.name,
      quantity: payload.quantity,
      totalAmount: totalAmount,
      capital: product.capital * payload.quantity,
      profit: (product.unitPrice - product.capital) * payload.quantity,
      buyerName: payload.buyerName,
      address: address,
      deliveryMethod: payload.deliveryMethod,
      paymentMethod: isUtang ? "UTANG" : "CASH",
      downpayment: downpayment
    }
    MOCK_SALES.unshift(newSale)
    recordMockMovement(product, "SALE", stockBefore, `Sale ${newSale.transactionId}`, newSale.transactionId)
    if (customerTank) {
      MOCK_TANK_EXCHANGES.unshift({
        id: Date.now(), saleId: newSale.id, transactionId: newSale.transactionId,
        date: newSale.date, buyerName: newSale.buyerName, quantity: newSale.quantity,
        customerTankName: customerTank.name, customerTankSku: customerTank.sku,
        suppliedTankName: product.name, suppliedTankSku: product.sku,
        createdAt: new Date().toISOString(),
      })
    }

    if (isUtang) {
      const remaining = Math.max(0, totalAmount - downpayment)
      const mockLoan: LoanRecord = {
        id: Date.now(),
        category: "LPG",
        borrowerName: payload.buyerName,
        loanDate: newSale.date,
        description: `LPG Sale - ${newSale.transactionId}`,
        productPurchased: `${product.name} (${payload.quantity}x)`,
        totalAmount: totalAmount,
        amountPaid: downpayment,
        remainingBalance: remaining,
        status: remaining <= 0 ? "PAID" : downpayment > 0 ? "PARTIALLY_PAID" : "UNPAID",
        notes: "Auto-created from LPG Utang sale",
        payments: downpayment > 0 ? [
          {
            id: Date.now() + 1,
            amount: downpayment,
            paymentDate: newSale.date,
            notes: "Initial Downpayment"
          }
        ] : []
      }
      MOCK_LOANS.unshift(mockLoan)
    }

    return newSale
  }
  if (payload.tankExchange) {
    // An older backend silently ignores tankExchange. Verify support before saving the sale.
    try {
      await getTankExchanges(0, 1)
    } catch (err) {
      throw new Error(`Tank exchange is unavailable on the backend. Update the backend before recording this sale. ${err instanceof Error ? err.message : ""}`.trim())
    }
  }
  const response = await request<SaleApiRecord>("/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return normalizeSale(response)
}

export async function getTankExchanges(page = 0, size = 25): Promise<TankExchangePage> {
  if (USE_MOCK) {
    return {
      content: MOCK_TANK_EXCHANGES.slice(page * size, (page + 1) * size),
      number: page, totalPages: Math.ceil(MOCK_TANK_EXCHANGES.length / size),
      totalElements: MOCK_TANK_EXCHANGES.length,
    }
  }
  return request<TankExchangePage>(`/sales/tank-exchanges?page=${page}&size=${size}`)
}

export async function createProduct(payload: Omit<Product, "id">): Promise<Product> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const newProduct: Product = {
      ...payload,
      id: String(Math.max(0, ...MOCK_PRODUCTS.map((product) => Number(product.id))) + 1)
    }
    MOCK_PRODUCTS.push(newProduct)
    recordMockMovement(newProduct, "OPENING", 0, "Initial stock when product was added")
    return newProduct
  }
  return request<Product>("/inventory/products", {
    method: "POST",
    // Older deployed backends still validate this field; newer ones default it internally.
    body: JSON.stringify({ ...payload, type: "LPG Tank" }),
  })
}

export async function getStockMovements(productId?: string, page = 0, size = 25): Promise<StockMovementPage> {
  if (USE_MOCK) {
    const rows = productId ? MOCK_MOVEMENTS.filter((movement) => String(movement.productId) === productId) : MOCK_MOVEMENTS
    return {
      content: rows.slice(page * size, (page + 1) * size), number: page,
      totalPages: Math.ceil(rows.length / size), totalElements: rows.length,
    }
  }
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (productId) params.set("productId", productId)
  return request<StockMovementPage>(`/inventory/movements?${params}`)
}

export async function updateStock(productId: string, stock: number,
                                  movementType: "CORRECTION" | "DAMAGE", reason: string): Promise<Product> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const product = MOCK_PRODUCTS.find(p => p.id === productId)
    if (!product) throw new Error("Product not found")
    if (stock === product.stock || stock < 0 || (movementType === "DAMAGE" && stock >= product.stock)) {
      throw new Error("Invalid stock adjustment")
    }
    const before = product.stock
    product.stock = stock
    recordMockMovement(product, movementType, before, reason)
    return product
  }
  return request<Product>(`/inventory/products/${productId}/stock`, {
    method: "PUT",
    body: JSON.stringify({ stock, movementType, reason }),
  })
}

export async function updateProduct(productId: string, payload: Omit<Product, "id" | "stock">): Promise<Product> {
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

export async function restockProduct(productId: string, quantity: number, capital: number, note = ""): Promise<Product> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const product = MOCK_PRODUCTS.find(p => p.id === productId)
    if (!product) throw new Error("Product not found")
    const before = product.stock
    product.stock += quantity
    product.capital = capital
    recordMockMovement(product, "RESTOCK", before, note.trim() || "Stock replenishment")
    return product
  }
  return request<Product>(`/inventory/products/${productId}/restock`, {
    method: "POST",
    body: JSON.stringify({ quantity, capital, note }),
  })
}

export async function deleteProduct(productId: string, password: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const index = MOCK_PRODUCTS.findIndex(p => p.id === productId)
    if (index !== -1) {
      const product = MOCK_PRODUCTS[index]
      const before = product.stock
      product.stock = 0
      recordMockMovement(product, "PRODUCT_DELETED", before, "Product deleted after password confirmation")
      MOCK_PRODUCTS.splice(index, 1)
    }
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
    if (index !== -1) {
      if (MOCK_TANK_EXCHANGES.some((exchange) => exchange.saleId === saleId)) {
        throw new Error("Tank exchange sales cannot be deleted; retain them for exchange audit history")
      }
      const sale = MOCK_SALES[index]
      const product = MOCK_PRODUCTS.find((candidate) => candidate.name === sale.productName)
      if (product) {
        const before = product.stock
        product.stock += sale.quantity
        recordMockMovement(product, "SALE_REVERSAL", before, `Deleted sale ${sale.transactionId}`, sale.transactionId)
      }
      MOCK_SALES.splice(index, 1)
    }
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
      const name = r.productName
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
    const name = r.productName
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

/* -------------------------------------------------------------------------- */
/*                                Loan Tracker                                */
/* -------------------------------------------------------------------------- */

export async function getLoans(category?: LoanCategory): Promise<LoanRecord[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200))
    if (!category) return [...MOCK_LOANS]
    return MOCK_LOANS.filter((l) => l.category === category)
  }

  const query = category ? `?category=${category}` : ""
  const response = await request<LoanApiRecord[]>(`/loans${query}`)
  return response.map(normalizeLoan)
}

export async function createOtherLoan(payload: CreateLoanPayload): Promise<LoanRecord> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const downpayment = payload.downpayment ?? 0
    if (downpayment < 0) throw new Error("Downpayment cannot be negative")
    if (downpayment > payload.totalAmount) throw new Error("Downpayment cannot exceed total amount")

    const remaining = Math.max(0, payload.totalAmount - downpayment)
    const today = new Date().toISOString().slice(0, 10)
    const loanDate = payload.loanDate || today

    const newLoan: LoanRecord = {
      id: Date.now(),
      category: "OTHER",
      borrowerName: payload.borrowerName.trim(),
      loanDate: loanDate,
      description: payload.description.trim(),
      totalAmount: payload.totalAmount,
      amountPaid: downpayment,
      remainingBalance: remaining,
      status: remaining <= 0 ? "PAID" : downpayment > 0 ? "PARTIALLY_PAID" : "UNPAID",
      notes: payload.notes?.trim() || undefined,
      payments: downpayment > 0 ? [
        {
          id: Date.now() + 1,
          amount: downpayment,
          paymentDate: loanDate,
          notes: "Initial Downpayment"
        }
      ] : []
    }
    MOCK_LOANS.unshift(newLoan)
    return newLoan
  }

  const response = await request<LoanApiRecord>("/loans", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return normalizeLoan(response)
}

export async function recordLoanPayment(loanId: number, payload: RecordPaymentPayload): Promise<LoanRecord> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const loan = MOCK_LOANS.find((l) => l.id === loanId)
    if (!loan) throw new Error("Loan not found")
    if (loan.status === "PAID" || loan.remainingBalance <= 0) {
      throw new Error("Loan is already fully paid")
    }
    if (payload.amount <= 0) {
      throw new Error("Payment amount must be greater than zero")
    }
    if (payload.amount > loan.remainingBalance) {
      throw new Error(`Payment amount (₱${payload.amount}) cannot exceed remaining balance (₱${loan.remainingBalance})`)
    }

    const today = new Date().toISOString().slice(0, 10)
    const paymentDate = payload.paymentDate || today

    const payment: LoanPayment = {
      id: Date.now(),
      amount: payload.amount,
      paymentDate: paymentDate,
      notes: payload.notes?.trim() || undefined,
      createdAt: new Date().toISOString()
    }
    loan.payments.unshift(payment)

    loan.amountPaid += payload.amount
    loan.remainingBalance = Math.max(0, loan.totalAmount - loan.amountPaid)
    loan.status = loan.remainingBalance === 0 ? "PAID" : "PARTIALLY_PAID"

    return { ...loan }
  }

  const response = await request<LoanApiRecord>(`/loans/${loanId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return normalizeLoan(response)
}
