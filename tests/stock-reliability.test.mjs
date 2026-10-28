import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

// Execute the real components and refresh hook with in-memory hooks, storage,
// timers, and API responses. No browser, server, or database is contacted.
class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

const product = (stock) => ({ id: "6", sku: "SK-2.7", name: "SK 2.7kg", stock, unitPrice: 1000, capital: 700 })
const summary = { totalRevenue: 0, totalProfit: 0, totalOrders: 0, averageTransactionValue: 0 }
const values = { productId: "6", quantity: "1", buyerName: "Buyer", address: "", deliveryMethod: "Pick up", paymentMethod: "Cash" }

function eventTarget() {
  const listeners = new Map()
  return {
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name).add(callback)
    },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback) },
    dispatch(name) { for (const callback of listeners.get(name) ?? []) callback() },
  }
}

function page(name, overrides = {}, storage = new Map()) {
  let cursor = 0
  let effects = []
  let tree
  const slots = []
  const timers = new Map()
  const window = { ...eventTarget(), setInterval(fn, ms) { const id = randomUUID(); timers.set(id, { fn, ms }); return id }, clearInterval(id) { timers.delete(id) } }
  const document = { ...eventTarget(), visibilityState: "visible" }
  const react = {
    useState(initial) {
      const id = cursor++
      if (!(id in slots)) slots[id] = typeof initial === "function" ? initial() : initial
      return [slots[id], (value) => { slots[id] = typeof value === "function" ? value(slots[id]) : value }]
    },
    useRef(initial) { const id = cursor++; return slots[id] ??= { current: initial } },
    useEffect(effect, deps) {
      const id = cursor++
      if (!slots[id] || deps.some((dep, i) => !Object.is(dep, slots[id].deps[i]))) {
        effects.push(() => { slots[id]?.cleanup?.(); slots[id] = { deps, cleanup: effect() } })
      }
    },
  }
  const jsx = (type, props) => ({ type, props })
  const stubs = new Proxy({}, { get: (_, key) => key })
  const api = {
    ApiError,
    getInventory: async () => ({ products: [product(94)] }),
    getSales: async () => ({ summary, records: [] }),
    getSettings: async () => ({ businessName: "Test" }),
    getDashboardAnalytics: async () => ({ todaySummary: summary, last7DaysSummary: summary, dailyRevenue: [], productBreakdown: [] }),
    createSale: async () => { throw new Error("Unexpected sale request") },
    ...overrides,
  }
  const modules = new Map()
  const context = vm.createContext({
    window, document, navigator: { userAgent: "Test" }, crypto: { randomUUID },
    console: { ...console, error() {} }, setTimeout, clearTimeout,
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    FormData: class { constructor(form) { this.values = form.values } get(key) { return this.values[key] ?? null } },
    fetch() { throw new Error("Network access is forbidden in regression tests") },
  })
  function load(file) {
    if (modules.has(file)) return modules.get(file)
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const exports = {}
    modules.set(file, exports)
    const require = (id) => {
      if (id === "react") return react
      if (id === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" }
      if (id === "@/lib/api") return api
      if (id === "@/lib/privacy") return { usePrivacy: () => ({ privacyEnabled: false }), privateText: value => value, requireVisibleDetails: () => {} }
      if (id === "@/lib/auth") return { useAuth: () => ({ username: "admin" }) }
      if (id === "@/lib/utils") return { cn: (...parts) => parts.filter(Boolean).join(" "), formatCurrency: String, formatDate: String }
      if (id === "@/lib/pendingSale" || id === "@/lib/useInventoryRefresh") return load(`src/lib/${id.split("/").at(-1)}.ts`)
      if (id.startsWith("@/components/") || ["lucide-react", "recharts", "react-router-dom"].includes(id)) return stubs
      throw new Error(`Unexpected import: ${id}`)
    }
    vm.runInContext(`(function(require, exports) { ${compiled}\n})`, context)(require, exports)
    return exports
  }
  const Component = load(`src/pages/${name}.tsx`)[name]
  const render = () => { cursor = 0; effects = []; tree = Component(); for (const effect of effects) effect(); return tree }
  const flush = async () => { for (let i = 0; i < 3; i++) { await new Promise(setImmediate); render() } }
  function nodes(node) {
    if (node == null || typeof node === "boolean") return []
    if (Array.isArray(node)) return node.flatMap((item) => nodes(item))
    if (typeof node !== "object") return [node]
    return [node, ...nodes(node.props?.children)]
  }
  const find = (predicate) => nodes(tree).find((node) => typeof node === "object" && predicate(node))
  return {
    render, flush, window, document, storage, timers, find,
    text: () => nodes(tree).filter((node) => typeof node !== "object").join(""),
    async openSale() { find((node) => node.type === "Button" && node.props.onClick && node.props.children?.includes("Record Sale"))?.props.onClick(); await flush() },
    async submit() { await find((node) => node.type === "form" && node.props.onSubmit).props.onSubmit({ preventDefault() {}, currentTarget: { values } }); await flush() },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
  }
}

test("lost sale response followed by a rejected retry keeps one sale and deduction, even after reload", async (t) => {
  for (const status of [400, 403, 404, 409, 429]) {
    await t.test(`HTTP ${status}`, async () => {
      let stock = 94
      let attempts = 0
      const saved = new Map()
      const requestIds = []
      const api = { async createSale(payload) {
        requestIds.push(payload.requestId)
        attempts++
        if (attempts === 2) throw new ApiError("Retry rejected", status)
        if (!saved.has(payload.requestId)) {
          stock--
          saved.set(payload.requestId, { id: "1", transactionId: "TXN-1", productId: "6", productName: "SK 2.7kg", quantity: 1, remainingStock: stock })
        }
        if (attempts === 1) throw new Error("Response lost after commit")
        return saved.get(payload.requestId)
      } }
      const storage = new Map()
      let app = page("SalesPage", api, storage)
      app.render(); await app.flush(); await app.openSale(); await app.submit()
      assert.equal(stock, 93)
      app.unmount()
      app = page("SalesPage", api, storage)
      app.render(); await app.flush(); await app.submit()
      assert.equal(storage.size, 1, "uncertain request must survive a rejected retry")
      assert.equal(app.find((node) => node.type === "fieldset").props.disabled, true)
      await app.submit()
      assert.equal(new Set(requestIds).size, 1)
      assert.equal(saved.size, 1)
      assert.equal(stock, 93)
      assert.equal(storage.size, 0)
      app.unmount()
    })
  }
})

test("an initial validation rejection allows correction without deducting stock", async () => {
  const app = page("SalesPage", { createSale: async () => { throw new ApiError("Insufficient stock", 400) } })
  app.render(); await app.flush(); await app.openSale(); await app.submit()
  assert.equal(app.storage.size, 0)
  assert.equal(app.find((node) => node.type === "fieldset").props.disabled, false)
  app.unmount()
})

test("an initial rate limit preserves the request ID for a safe retry", async () => {
  const app = page("SalesPage", { createSale: async () => { throw new ApiError("Rate limited", 429) } })
  app.render(); await app.flush(); await app.openSale(); await app.submit()
  assert.equal(app.storage.size, 1)
  assert.equal(app.find((node) => node.type === "fieldset").props.disabled, true)
  app.unmount()
})

test("Dashboard refreshes stock on focus and visible timer ticks despite analytics failure", async () => {
  let stock = 94
  let calls = 0
  let failed = false
  const app = page("DashboardPage", {
    getDashboardAnalytics: async () => { throw new Error("Analytics unavailable") },
    getInventory: async () => { calls++; if (failed) throw new Error("Offline"); return { products: [product(stock)] } },
  })
  app.render(); await app.flush()
  assert.match(app.text(), /94 left/)
  stock = 93
  app.window.dispatch("focus"); await app.flush()
  assert.match(app.text(), /93 left/)
  const timer = [...app.timers.values()][0]
  assert.equal(timer.ms, 30_000)
  app.document.visibilityState = "hidden"
  timer.fn(); await app.flush()
  assert.equal(calls, 2)
  app.document.visibilityState = "visible"
  stock = 92
  timer.fn(); await app.flush()
  assert.match(app.text(), /92 left/)
  failed = true
  app.document.dispatch("visibilitychange"); await app.flush()
  assert.match(app.text(), /Displayed quantities may be outdated/)
  assert.match(app.text(), /92 left/)
  failed = false; stock = 91
  app.find((node) => node.type === "Button" && node.props.children === "Retry").props.onClick(); await app.flush()
  assert.match(app.text(), /91 left/)
  assert.equal(app.find((node) => node.props.role === "alert"), undefined)
  app.unmount()
  assert.equal(app.timers.size, 0)
})

test("Dashboard ignores an older inventory response arriving after a newer response", async () => {
  const responses = []
  const app = page("DashboardPage", { getInventory: () => new Promise((resolve) => responses.push(resolve)) })
  app.render()
  // Focus before React has rendered the initial loading-state update.
  app.window.dispatch("focus")
  assert.equal(responses.length, 2)
  responses[1]({ products: [product(93)] }); await app.flush()
  responses[0]({ products: [product(94)] }); await app.flush()
  assert.match(app.text(), /93 left/)
  assert.doesNotMatch(app.text(), /94 left/)
  app.unmount()
})

test("the open sale dropdown refreshes after another device sells or restocks", async () => {
  let stock = 116
  const app = page("SalesPage", { getInventory: async () => ({ products: [product(stock)] }) })
  app.render(); await app.flush(); await app.openSale()
  assert.equal(app.find((node) => node.type === "Modal" && node.props.title === "Record Sale").props.isOpen, true)
  assert.match(app.text(), /Stock: 116/)
  stock = 114
  for (const { fn } of app.timers.values()) fn()
  await app.flush()
  assert.match(app.text(), /Stock: 114/)
  assert.equal(app.find((node) => node.props.name === "quantity").props.max, 114)
  stock = 141
  app.window.dispatch("focus"); await app.flush()
  assert.match(app.text(), /Stock: 141/)
  assert.equal(app.find((node) => node.props.name === "productId").props.value, "6")
  app.unmount()
})

test("a stock read started before a sale cannot overwrite the confirmed remaining stock", async () => {
  let defer = false
  let resolveRead
  let stock = 94
  const app = page("SalesPage", {
    getInventory: () => defer ? new Promise((resolve) => { resolveRead = resolve }) : Promise.resolve({ products: [product(stock)] }),
    createSale: async () => {
      stock = 93
      defer = false
      // The earlier GET returns its old snapshot while this sale is saving.
      resolveRead({ products: [product(94)] })
      await new Promise(setImmediate)
      return { id: "1", transactionId: "TXN-1", productId: "6", productName: "SK 2.7kg", quantity: 1, remainingStock: 93 }
    },
  })
  app.render(); await app.flush(); await app.openSale()
  defer = true
  app.window.dispatch("focus"); app.render()
  assert.equal(app.find((node) => node.type === "fieldset").props.disabled, false, "background refresh must preserve an editable sale form")
  await app.submit()
  assert.match(app.text(), /Stock: 93/)
  assert.match(app.text(), /Stock remaining after confirmation: 93/)
  app.unmount()
})

test("an open sale form refreshes on reconnect and page restoration, including sold-out stock", async () => {
  let stock = 94
  let calls = 0
  const app = page("SalesPage", { getInventory: async () => { calls++; return { products: [product(stock)] } } })
  app.render(); await app.flush(); await app.openSale()
  stock = 120
  app.window.dispatch("online"); await app.flush()
  assert.match(app.text(), /Stock: 120/)
  stock = 0
  app.window.dispatch("pageshow"); await app.flush()
  assert.match(app.text(), /Stock: 0/)
  assert.equal(app.find((node) => node.type === "option" && node.props.value === "6").props.disabled, true)
  assert.equal(app.find((node) => node.props.type === "submit").props.disabled, true)
  const beforeUnmount = calls
  app.unmount()
  app.window.dispatch("online"); app.window.dispatch("pageshow"); app.window.dispatch("focus")
  await app.flush()
  assert.equal(calls, beforeUnmount, "refresh listeners must be cleaned up on navigation")
})

test("confirmation updates the dropdown even when the subsequent stock refresh fails", async () => {
  let saved = false
  const app = page("SalesPage", {
    getInventory: async () => { if (saved) throw new Error("Offline"); return { products: [product(94)] } },
    createSale: async () => { saved = true; return { id: "1", transactionId: "TXN-1", productId: "6", productName: "SK 2.7kg", quantity: 1, remainingStock: 93 } },
  })
  app.render(); await app.flush(); await app.openSale(); await app.submit()
  assert.match(app.text(), /Stock: 93/)
  assert.match(app.text(), /Stock remaining after confirmation: 93/)
  assert.match(app.text(), /Displayed quantities may be outdated/)
  assert.equal(app.storage.size, 0, "a failed refresh must not turn a saved sale into a retry")
  app.unmount()
})
