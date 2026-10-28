import { CalendarDays } from "lucide-react"
import type { DateRange } from "@/lib/api"
import { Button } from "./ui"
import { reportPresets, reportDateRange } from "@/lib/dateRanges"
import { philippineToday } from "@/lib/utils"

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  const today = philippineToday()

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="startDate"
          className="text-xs font-medium text-muted-foreground"
        >
          Start date
        </label>
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="startDate"
            type="date"
            value={value.startDate}
            max={value.endDate || today}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            className="h-10 rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="endDate"
          className="text-xs font-medium text-muted-foreground"
        >
          End date
        </label>
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="endDate"
            type="date"
            value={value.endDate}
            min={value.startDate}
            max={today}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            className="h-10 rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {reportPresets.map((p) => {
          const dates = reportDateRange(p.label, today)
          const selected = value.startDate === dates.startDate && value.endDate === dates.endDate
          return (
            <Button
              key={p.label}
              type="button"
              variant={selected ? "primary" : "outline"}
              size="sm"
              title={p.description}
              aria-pressed={selected}
              onClick={() => onChange(dates)}
            >
              {p.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
