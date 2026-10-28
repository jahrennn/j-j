import { isPrivacyEnabled, PRIVACY_MASK } from "./privacyStore"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function philippineToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")}`
}

export function currentMonthRange() {
  const [year, month] = philippineToday().split("-").map(Number)
  const prefix = `${year}-${String(month).padStart(2, "0")}`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { startDate: `${prefix}-01`, endDate: `${prefix}-${lastDay}` }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  if (isPrivacyEnabled()) return PRIVACY_MASK
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}
