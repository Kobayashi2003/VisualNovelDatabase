import { cn } from "@/lib/utils"

interface SearchBarProps {
  input: string
  setInput: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchBar({ input, setInput, placeholder = "Search...", disabled, className }: SearchBarProps) {
  return (
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-full",
        "bg-elevated border border-white/10",
        "text-white text-sm placeholder:text-muted",
        "focus:outline-none focus:border-white/30",
        "hover:border-white/20",
        "transition-colors duration-200",
        "w-full",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    />
  )
}
