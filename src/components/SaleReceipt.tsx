import type { SaleRecord } from "@/lib/api"

// The PT-210 uses a 57 mm roll but prints on about 48 mm of that width.
const receiptStyles = `
  .sale-receipt { box-sizing: border-box; width: 48mm; max-width: 48mm; margin: 0 auto;
    padding: 3mm 0 4mm; background: white; color: black; font: 11px/1.35 Arial, sans-serif;
    overflow-wrap: anywhere; }
  .sale-receipt * { box-sizing: border-box; }
  .sale-receipt h1 { margin: 0; text-align: center; font-size: 13px; font-weight: 700; }
  .sale-receipt .subtitle { margin: 1mm 0 2mm; text-align: center; }
  .sale-receipt .rule { border-top: 1px dashed black; margin: 2mm 0; }
  .sale-receipt .line { display: flex; justify-content: space-between; gap: 2mm; margin: 1mm 0; }
  .sale-receipt .line span:first-child { flex: 0 0 auto; }
  .sale-receipt .line span:last-child { min-width: 0; text-align: right; }
  .sale-receipt .strong { font-weight: 700; font-size: 12px; }
  .sale-receipt .item { font-weight: 700; margin: 1mm 0; }
  .sale-receipt .note { margin: 2mm 0 0; text-align: center; font-size: 10px; }
`

const peso = (amount: number) => `PHP ${amount.toFixed(2)}`

function receiptDetails(sale: SaleRecord) {
  const delivery = sale.deliveryMethod ||
    (sale.address?.trim().toLowerCase() === "pick up" ? "Pick up" : "Deliver")
  const credit = sale.paymentMethod?.toUpperCase() === "UTANG"
  const date = new Intl.DateTimeFormat("en-PH", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(new Date(`${sale.date}T00:00:00Z`))
  return { delivery, credit, date }
}

export function SaleReceipt({ sale, businessName }: { sale: SaleRecord; businessName: string }) {
  const { delivery, credit, date } = receiptDetails(sale)

  return (
    <>
      <style>{receiptStyles}</style>
      <article className="sale-receipt" aria-label={`Receipt for ${sale.transactionId}`}>
        <h1>{businessName}</h1>
        <p className="subtitle">SALE RECEIPT</p>
        <div className="rule" />
        <div className="line"><span>Date</span><span>{date}</span></div>
        <div className="line"><span>Sale No.</span><span>{sale.transactionId}</span></div>
        <div className="line"><span>Customer</span><span>{sale.buyerName || "Walk-in"}</span></div>
        <div className="line"><span>Delivery</span><span>{delivery}</span></div>
        {delivery === "Deliver" && sale.address && (
          <div className="line"><span>Address</span><span>{sale.address}</span></div>
        )}
        <div className="line"><span>Payment</span><span>{credit ? "Utang" : "Cash"}</span></div>
        <div className="rule" />
        <p className="item">{sale.itemName || sale.item}</p>
        <div className="line">
          <span>{sale.quantity} x {peso(sale.totalAmount / sale.quantity)}</span>
          <span>{peso(sale.totalAmount)}</span>
        </div>
        <div className="rule" />
        <div className="line strong"><span>Total</span><span>{peso(sale.totalAmount)}</span></div>
        {credit && (
          <>
            <div className="line"><span>Downpayment</span><span>{peso(sale.downpayment || 0)}</span></div>
            <div className="line"><span>Balance at sale</span><span>{peso(sale.totalAmount - (sale.downpayment || 0))}</span></div>
          </>
        )}
        <div className="rule" />
        <p className="note">Thank you for your purchase!</p>
      </article>
    </>
  )
}

// The PT-210 print head is 384 dots wide. A PNG avoids relying on Android's
// browser print service and can be opened by compatible printer apps.
function drawReceiptImage(ctx: CanvasRenderingContext2D, sale: SaleRecord, businessName: string, paint: boolean): number {
  const { delivery, credit, date } = receiptDetails(sale)
  const inset = 12
  const width = 384 - inset * 2
  let y = 29

  const write = (text: string, font = "22px Arial", align: CanvasTextAlign = "left") => {
    ctx.font = font
    ctx.textBaseline = "alphabetic"
    ctx.textAlign = align
    const words = text.split(/\s+/)
    const lines: string[] = []
    let current = ""
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (current && ctx.measureText(next).width > width) {
        lines.push(current)
        current = word
      } else {
        current = next
      }
    }
    if (current) lines.push(current)
    for (const line of lines) {
      if (paint) ctx.fillText(line, align === "center" ? 192 : inset, y, width)
      y += 30
    }
  }

  const rule = () => {
    if (paint) {
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(inset, y - 6)
      ctx.lineTo(384 - inset, y - 6)
      ctx.stroke()
      ctx.setLineDash([])
    }
    y += 15
  }

  const pair = (label: string, value: string, font = "21px Arial") => {
    ctx.font = font
    const fits = ctx.measureText(label).width + ctx.measureText(value).width + 16 <= width
    if (fits) {
      if (paint) {
        ctx.textAlign = "left"
        ctx.fillText(label, inset, y)
        ctx.textAlign = "right"
        ctx.fillText(value, 384 - inset, y)
      }
      y += 30
    } else {
      write(label, font)
      write(value, font)
    }
  }

  write(businessName, "bold 25px Arial", "center")
  write("SALE RECEIPT", "21px Arial", "center")
  rule()
  pair("Date", date)
  pair("Sale No.", sale.transactionId)
  pair("Customer Name", sale.buyerName || "Walk-in")
  pair("Delivery Method", delivery)
  if (delivery === "Deliver" && sale.address) pair("Address", sale.address)
  pair("Payment Method", credit ? "Utang" : "Cash")
  rule()
  write(sale.itemName || sale.item, "bold 23px Arial")
  pair(`${sale.quantity} x ${peso(sale.totalAmount / sale.quantity)}`, peso(sale.totalAmount))
  rule()
  pair("TOTAL", peso(sale.totalAmount), "bold 24px Arial")
  if (credit) {
    pair("Downpayment", peso(sale.downpayment || 0))
    pair("Balance at sale", peso(sale.totalAmount - (sale.downpayment || 0)))
  }
  rule()
  write("Thank you for your purchase!", "20px Arial", "center")
  return y + 16
}

export async function downloadSaleReceiptPng(sale: SaleRecord, businessName: string): Promise<void> {
  const canvas = document.createElement("canvas")
  canvas.width = 384
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("This browser cannot create a receipt image.")
  canvas.height = drawReceiptImage(ctx, sale, businessName, false)
  // Assigning height clears the canvas and its drawing context.
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "#000"
  ctx.strokeStyle = "#000"
  drawReceiptImage(ctx, sale, businessName, true)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create the receipt image.")), "image/png")
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `receipt-${sale.transactionId.replace(/[^a-zA-Z0-9-]/g, "")}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function printSaleReceipt(receipt: HTMLElement, transactionId: string): boolean {
  const printWindow = window.open("", "_blank", "width=380,height=650")
  if (!printWindow) return false

  const doc = printWindow.document
  doc.title = `Receipt ${transactionId}`
  const viewport = doc.createElement("meta")
  viewport.name = "viewport"
  viewport.content = "width=device-width, initial-scale=1"
  doc.head.appendChild(viewport)

  const pageStyles = doc.createElement("style")
  pageStyles.textContent = `
    html, body { margin: 0; padding: 0; background: white; }
    body { width: 57mm; }
    .print-controls { box-sizing: border-box; width: 57mm; padding: 8px;
      display: flex; justify-content: space-between; font: 12px Arial, sans-serif; }
    @media print { .print-controls { display: none; } }
  `
  doc.head.appendChild(pageStyles)

  const controls = doc.createElement("div")
  controls.className = "print-controls"
  const printButton = doc.createElement("button")
  printButton.textContent = "Print receipt"
  printButton.addEventListener("click", () => printWindow.print())
  const closeButton = doc.createElement("button")
  closeButton.textContent = "Close"
  closeButton.addEventListener("click", () => printWindow.close())
  controls.append(printButton, closeButton)
  doc.body.appendChild(controls)

  const clone = receipt.cloneNode(true)
  doc.body.appendChild(clone)
  // Roll diameter is not receipt length. Size this page to its actual content.
  const article = doc.querySelector<HTMLElement>(".sale-receipt")
  const heightMm = Math.max(65, Math.ceil(((article?.scrollHeight || 0) * 25.4) / 96) + 3)
  pageStyles.textContent += `\n@page { size: 57mm ${heightMm}mm; margin: 0; }`
  printWindow.opener = null
  printWindow.focus()
  printWindow.print()
  return true
}
