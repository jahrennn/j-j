import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

// Run the real date helpers and picker with a fixed Philippine calendar date.
// No API, database, or browser is used.
const modules = new Map()
function load(file, now = "2026-10-28T18:00:00Z") {
  const cacheKey = `${file}/${now}`
  if (modules.has(cacheKey)) return modules.get(cacheKey)
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  const exports = {}
  const require = (id) => {
    if (id === "@/lib/dateRanges") return load("src/lib/dateRanges.ts", now)
    if (id === "@/lib/utils") return load("src/lib/utils.ts", now)
    if (id === "./privacyStore") return { isPrivacyEnabled: () => false }
    if (id === "clsx") return { clsx: (...values) => values.join(" ") }
    if (id === "tailwind-merge") return { twMerge: (value) => value }
    if (id === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
    if (id === "lucide-react") return { CalendarDays: "CalendarDays" }
    if (id === "./ui") return { Button: "Button" }
    throw new Error(`Unexpected import: ${id}`)
  }
  const RealDate = Date
  class FixedDate extends RealDate { constructor(...args) { super(...(args.length ? args : [now])) } }
  vm.runInNewContext(`(function(require, exports) { ${compiled}\n})`, { Date: FixedDate, Intl })(require, exports)
  modules.set(cacheKey, exports)
  return exports
}
const plain = (value) => JSON.parse(JSON.stringify(value))
const { reportDateRange } = load("src/lib/dateRanges.ts")

test("Today and 1D are distinct Philippine calendar days even before UTC midnight", () => {
  assert.deepEqual(plain(reportDateRange("Today")), { startDate: "2026-10-29", endDate: "2026-10-29" })
  assert.deepEqual(plain(reportDateRange("1D")), { startDate: "2026-10-28", endDate: "2026-10-28" })
})

test("7D, 30D, and 90D include exactly the advertised number of dates", () => {
  for (const [label, count] of [["7D", 7], ["30D", 30], ["90D", 90]]) {
    const range = reportDateRange(label, "2026-10-29")
    assert.equal(range.endDate, "2026-10-29")
    assert.equal((Date.parse(range.endDate) - Date.parse(range.startDate)) / 86_400_000 + 1, count)
  }
  assert.equal(reportDateRange("7D", "2026-10-29").startDate, "2026-10-23")
})

test("presets cross leap days, month boundaries, and year boundaries", () => {
  assert.equal(reportDateRange("1D", "2028-03-01").startDate, "2028-02-29")
  assert.equal(reportDateRange("7D", "2027-01-03").startDate, "2026-12-28")
  assert.equal(reportDateRange("30D", "2026-03-01").startDate, "2026-01-31")
})

test("picker orders Today and 1D before 7D, passes dates, and marks the selected preset", () => {
  const { DateRangePicker } = load("src/components/DateRangePicker.tsx")
  const changed = []
  const tree = DateRangePicker({ value: reportDateRange("7D"), onChange: (range) => changed.push(plain(range)) })
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes)
    if (!node || typeof node !== "object") return []
    return [node, ...nodes(node.props.children)]
  }
  const buttons = nodes(tree).filter((node) => node.type === "Button")
  assert.deepEqual(Array.from(buttons, (node) => node.props.children), ["Today", "1D", "7D", "30D", "90D"])
  assert.equal(buttons[2].props["aria-pressed"], true)
  assert.equal(buttons[0].props["aria-pressed"], false)
  buttons[0].props.onClick()
  buttons[1].props.onClick()
  assert.deepEqual(changed, [plain(reportDateRange("Today")), plain(reportDateRange("1D"))])
  assert.match(buttons[1].props.title, /Yesterday/)
})
