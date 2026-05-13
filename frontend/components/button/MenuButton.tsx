"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { MoreHorizontal } from "lucide-react"

interface MenuOption {
  name: string
  onClick: () => void
}

interface MenuButtonProps {
  options: MenuOption[]
  disabled?: boolean
  className?: string
}

export function MenuButton({ options, disabled, className }: MenuButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={cn(
          "p-2 rounded-full",
          "text-muted hover:text-white",
          "hover:bg-white/10",
          "transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className
        )}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className={cn(
          "absolute right-0 top-full mt-1 z-50",
          "min-w-40 py-1 rounded-lg",
          "bg-elevated border border-white/10",
          "shadow-lg shadow-black/50"
        )}>
          {options.map((option) => (
            <button
              key={option.name}
              onClick={() => { option.onClick(); setOpen(false) }}
              className="w-full px-4 py-2 text-sm text-left text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
