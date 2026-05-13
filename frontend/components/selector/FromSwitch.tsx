import { cn } from "@/lib/utils"

interface FromSwitchProps {
  selected: string
  setSelected: (from: string) => void
  disabled?: boolean
  className?: string
}

export function FromSwitch({ selected, setSelected, disabled, className }: FromSwitchProps) {
  const options = [
    { value: "both", label: "Both" },
    { value: "remote", label: "Remote" },
    { value: "local", label: "Local" },
  ]

  return (
    <div className={cn(
      "flex flex-row items-center rounded-full border border-white/10 overflow-hidden",
      disabled && "opacity-40 cursor-not-allowed",
      className
    )}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => !disabled && setSelected(option.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-all duration-200",
            selected === option.value
              ? "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
