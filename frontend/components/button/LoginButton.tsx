import { cn } from "@/lib/utils"

interface LoginButtonProps {
  handleLogin: () => void
  disabled?: boolean
  className?: string
}

export function LoginButton({ handleLogin, disabled, className }: LoginButtonProps) {
  return (
    <button
      onClick={handleLogin}
      disabled={disabled}
      className={cn(
        "px-4 py-1.5 rounded-full",
        "text-sm font-bold text-white",
        "border border-white/30 hover:border-white",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      Login
    </button>
  )
}
