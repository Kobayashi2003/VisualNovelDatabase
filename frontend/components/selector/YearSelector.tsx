/** Year picker dropdown; range is 1985 → current+1, with `"00"` as "any year". */
"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

interface YearSelectorProps {
  selectedYear: string
  setSelectedYear: (year: string) => void
  disabled?: boolean
  className?: string
}

export function YearSelector({ selectedYear, setSelectedYear, disabled, className }: YearSelectorProps) {
  const currentYear = new Date().getFullYear()
  const years = [
    { value: "00", label: "ALL" },
    ...Array.from({ length: currentYear - 1985 + 2 }, (_, i) => {
      const y = (1985 + i).toString()
      return { value: y, label: y }
    })
  ]

  return (
    <div className={cn("relative", className)}>
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
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
        {years.map((year) => (
          <option key={year.value} value={year.value} className="bg-elevated">
            {year.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
    </div>
  )
}
