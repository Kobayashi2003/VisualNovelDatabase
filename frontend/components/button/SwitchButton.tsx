/** Segmented switch — renders a row of mutually-exclusive option buttons. */

import { cn } from "@/lib/utils"

interface SwitchButtonOption {
  value: string
  icon?: React.ReactNode
  label?: string
  tooltip?: string
}

interface SwitchButtonProps {
  options: SwitchButtonOption[]
  selected: string
  onSelect: (value: string) => void
  disabled?: boolean
  className?: string
}

export function SwitchButton({ options, selected, onSelect, disabled, className }: SwitchButtonProps) {
  return (
    <div className={cn(
      "flex items-center",
      "rounded-full border border-white/10",
      "overflow-hidden",
      disabled && "opacity-40 cursor-not-allowed",
      className
    )}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => !disabled && onSelect(option.value)}
          title={option.tooltip}
          className={cn(
            "px-3 py-1.5 text-sm transition-all duration-200",
            "flex items-center gap-1",
            selected === option.value
              ? "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          {option.icon}
          {option.label && <span>{option.label}</span>}
        </button>
      ))}
    </div>
  )
}
