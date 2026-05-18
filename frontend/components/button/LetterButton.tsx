/** Single-letter pill button (used for user avatars / initials). */

import { cn } from "@/lib/utils"

interface LetterButtonProps {
  letter: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function LetterButton({ letter, onClick, disabled, className }: LetterButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-8 h-8 rounded-full",
        "bg-accent text-white font-bold text-sm",
        "hover:bg-accent-hover hover:scale-105",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      {letter}
    </button>
  )
}
