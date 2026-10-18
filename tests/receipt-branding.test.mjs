import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const sale = {
  id: "1", date: "2026-10-18", transactionId: "TXN-LOCAL-TEST",
  productName: "SK 2.7kg", quantity: 2, totalAmount: 2000,
  buyerName: "Local test buyer", address: "Pick up", paymentMethod: "CASH",
}

function receiptModule({ imageFails = false, popup = null } = {}) {
  const drawn = []
  const text = []
  const ctx = new Proxy({
    measureText: (value) => ({ width: value.length * 10 }),
    fillText: (value) => text.push(value),
    drawImage: (...args) => drawn.push(args),
  }, { get: (target, key) => target[key] ?? (() => {}) })
  const canvas = { width: 0, height: 0, getContext: () => ctx, toBlob: (done) => done(new Blob(["mock"], { type: "image/png" })) }
  let downloaded = false
  const element = () => ({ style: {}, append() {}, appendChild() {}, addEventListener() {}, remove() {}, click() { downloaded = true } })
  const context = vm.createContext({
    Blob,
    Image: class { set src(value) { this.source = value; queueMicrotask(() => imageFails ? this.onerror() : this.onload()) } },
    document: { createElement: (type) => type === "canvas" ? canvas : element(), body: element() },
    window: {
      setTimeout: (fn, ms) => { const timer = setTimeout(fn, ms); timer.unref(); return timer },
      clearTimeout,
      open: () => popup,
    },
    URL: { createObjectURL: () => "blob:local-test", revokeObjectURL() {} },
  })
  const source = readFileSync(new URL("../src/components/SaleReceipt.tsx", import.meta.url), "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  const require = (name) => {
    if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
    if (name === "@/components/BrandLogo") return { BrandLogo: "BrandLogo" }
    if (name === "@/lib/brand") return { BRAND_MARK_URL: "/brand/jahren-john-mark-v1.png" }
    throw new Error(`Unexpected import: ${name}`)
  }
  vm.runInContext(`(function(require, exports) { ${compiled}\n})`, context)(require, exports)
  return { ...exports, drawn, text, canvas, downloaded: () => downloaded }
}

test("receipt PNG includes the logo and preserves transaction values", async () => {
  const receipt = receiptModule()
  await receipt.downloadSaleReceiptPng(sale, "Jahren & John LPG Trading")
  assert.equal(receipt.drawn.length, 1)
  assert.equal(receipt.canvas.width, 384)
  assert.ok(receipt.canvas.height > 400)
  assert.ok(receipt.text.includes("TXN-LOCAL-TEST"))
  assert.ok(receipt.text.includes("2 x PHP 1000.00"))
  assert.ok(receipt.text.includes("PHP 2000.00"))
  assert.equal(receipt.downloaded(), true)
})

test("receipt data still exports if the branding asset fails to load", async () => {
  const receipt = receiptModule({ imageFails: true })
  await receipt.downloadSaleReceiptPng(sale, "Jahren & John LPG Trading")
  assert.equal(receipt.drawn.length, 0)
  assert.ok(receipt.text.includes("TXN-LOCAL-TEST"))
  assert.ok(receipt.text.includes("PHP 2000.00"))
  assert.equal(receipt.downloaded(), true)
})

test("browser printing waits for the logo before measuring the receipt", async () => {
  let finishLoading
  let printed = 0
  let measured = false
  const image = { complete: false, naturalWidth: 0, remove() {}, addEventListener: (event, done) => { if (event === "load") finishLoading = done } }
  const element = () => ({ append() {}, appendChild() {}, addEventListener() {} })
  const popup = {
    closed: false, focus() {}, print() { assert.equal(measured, true); printed++ },
    document: {
      images: [image], head: element(), body: element(), createElement: element,
      querySelector() { measured = true; return { scrollHeight: 300 } },
    },
  }
  const receipt = receiptModule({ popup })
  assert.equal(receipt.printSaleReceipt({ cloneNode: () => ({}) }, sale.transactionId), true)
  assert.equal(printed, 0)
  image.complete = true; image.naturalWidth = 1254; finishLoading()
  await new Promise(setImmediate)
  assert.equal(printed, 1)
})
