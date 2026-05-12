"use client"

import { cn } from "@/lib/utils"

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
    <select
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
      disabled={disabled}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-bold",
        "bg-elevated border border-white/10",
        "text-white",
        "focus:outline-none focus:border-white/30",
        "hover:border-white/20",
        "cursor-pointer",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      {MONTHS.map((month) => (
        <option key={month.value} value={month.value} className="bg-elevated">
          {month.label}
        </option>
      ))}
    </select>
  )
}
