/** Single-select dropdown that shows a sprite icon beside each option — used for
 *  the language / platform filters, whose codes have flag/platform sprites that
 *  a native <select> can't render. */
"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ICON } from "@/lib/icons"

interface Option { value: string; label: string }

interface IconSelectProps {
  value: string
  options: Option[]
  iconType: "LANGUAGE" | "PLATFORM"
  onChange: (value: string) => void
}

export function IconSelect({ value, options, iconType, onChange }: IconSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const icons = ICON[iconType] as Record<string, string>
  const selected = options.find(o => o.value === value) ?? options[0]

  // Close on outside click or Escape (mirrors EntityFilter).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const pick = (v: string) => { onChange(v); setOpen(false) }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger — styled to match the native <select> used elsewhere. */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 w-full pl-3 pr-8 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm text-left focus:outline-none focus:border-white/30 cursor-pointer"
      >
        {icons[selected.value] && <span className={cn(icons[selected.value], "shrink-0")} />}
        <span className="flex-1 min-w-0 truncate">{selected.label}</span>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg bg-elevated border border-white/10 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {options.map(o => {
            const isSel = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={cn(
                  "flex items-center gap-1.5 w-full px-3 py-2 text-sm text-left transition-colors",
                  isSel ? "bg-white/10 text-white" : "text-muted hover:text-white hover:bg-white/8"
                )}
              >
                {icons[o.value]
                  ? <span className={cn(icons[o.value], "shrink-0")} />
                  : <span className="w-4 shrink-0" />}
                <span className="flex-1 truncate">{o.label}</span>
                {isSel && <Check className="w-3.5 h-3.5 shrink-0 text-accent" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
