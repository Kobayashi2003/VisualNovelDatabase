/** Header "Sign up" pill button. */

import { cn } from "@/lib/utils"

interface RegisterButtonProps {
  handleRegister: () => void
  disabled?: boolean
  className?: string
}

export function RegisterButton({ handleRegister, disabled, className }: RegisterButtonProps) {
  return (
    <button
      onClick={handleRegister}
      disabled={disabled}
      className={cn(
        "px-4 py-1.5 rounded-full",
        "text-sm font-bold text-white",
        "bg-accent hover:bg-accent-hover",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      Sign up
    </button>
  )
}
