import { CalendarDays } from "lucide-react"
import type { DateRange } from "@/lib/api"
import { Button } from "./ui"

interface Preset {
  label: string
  days: number
}

const presets: Preset[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
]

function toLocalDateString(d: Date): string {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toLocalDateString(d)
}

function today(): string {
  return toLocalDateString(new Date())
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  function applyPreset(days: number) {
    onChange({ startDate: isoDaysAgo(days), endDate: today() })
  }

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
            max={value.endDate || today()}
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
            max={today()}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            className="h-10 rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(p.days)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
