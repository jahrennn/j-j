import type { DateRange } from "@/lib/api"
import { philippineToday } from "@/lib/utils"

export const reportPresets = [
  { label: "Today", days: 1, offset: 0, description: "Today (Philippine time)" },
  { label: "1D", days: 1, offset: 1, description: "Yesterday (one complete day)" },
  { label: "7D", days: 7, offset: 0, description: "Last 7 days, including today" },
  { label: "30D", days: 30, offset: 0, description: "Last 30 days, including today" },
  { label: "90D", days: 90, offset: 0, description: "Last 90 days, including today" },
] as const

export type ReportPreset = typeof reportPresets[number]["label"]

export function reportDateRange(label: ReportPreset, today = philippineToday()): DateRange {
  const preset = reportPresets.find((entry) => entry.label === label)!
  const day = new Date(`${today}T00:00:00Z`)
  const shift = (days: number) => {
    const date = new Date(day)
    date.setUTCDate(date.getUTCDate() - days)
    return date.toISOString().slice(0, 10)
  }
  return { startDate: shift(preset.offset + preset.days - 1), endDate: shift(preset.offset) }
}
