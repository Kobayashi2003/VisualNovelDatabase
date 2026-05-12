"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

const MONTHS = [
  { value: "00", label: "ALL" },
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
]

interface MonthSelectorProps {
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  disabled?: boolean
  className?: string
}

export function MonthSelector({ selectedMonth, setSelectedMonth, disabled, className }: MonthSelectorProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        disabled={disabled}
        className={cn(
          "appearance-none pl-3 pr-8 py-1.5 rounded-full text-sm font-bold",
          "bg-elevated border border-white/10",
          "text-white",
          "focus:outline-none focus:border-white/30",
          "hover:border-white/20",
          "cursor-pointer",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        {MONTHS.map((month) => (
          <option key={month.value} value={month.value} className="bg-elevated">
            {month.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
    </div>
  )
}
