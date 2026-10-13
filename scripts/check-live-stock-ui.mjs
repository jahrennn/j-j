// Read public HTML and JavaScript only. Never log in, execute the bundle, or
// contact sale/inventory endpoints. Run after publishing the frontend.
const appUrl = new URL(process.argv[2] ?? "https://j-j-zeta.vercel.app/")
const response = await fetch(appUrl, { cache: "no-store", signal: AbortSignal.timeout(30_000) })
if (!response.ok) throw new Error(`App page returned HTTP ${response.status}`)
const html = await response.text()
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
if (!scripts.length) throw new Error("No JavaScript bundle found in the app page")

let code = ""
for (const [, src] of scripts) {
  const url = new URL(src, appUrl)
  if (url.origin !== appUrl.origin) continue
  const asset = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) })
  if (!asset.ok) throw new Error(`Bundle returned HTTP ${asset.status}: ${url.pathname}`)
  code += await asset.text()
  console.log(`Checked ${url.pathname}`)
}

const checks = [
  ["Safe sale retry support", "recording-support"],
  ["Pending sale preservation", "jjlpg.pending-sale"],
  ["Refresh after returning to the app", "visibilitychange"],
  ["Refresh while Record Sale is open", "Stock refreshes automatically while this form is open."],
  ["Separate available-stock display", "Available stock for"],
]
for (const [name, marker] of checks) console.log(`${code.includes(marker) ? "PASS" : "MISSING"}: ${name}`)
if (checks.some(([, marker]) => !code.includes(marker))) {
  console.error("The published frontend is missing stock fixes. Deploy the latest source to this production URL, then reload open app tabs.")
  process.exitCode = 1
}
