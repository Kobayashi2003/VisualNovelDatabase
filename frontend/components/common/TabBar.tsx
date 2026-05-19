/** Reusable pill-style tab bar. */
"use client"

import { cn } from "@/lib/utils"

export interface TabItem {
  value: string
  label: string
  count?: number
}

interface TabBarProps {
  tabs: TabItem[]
  active: string
  onChange: (value: string) => void
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            active === tab.value
              ? "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-muted">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
