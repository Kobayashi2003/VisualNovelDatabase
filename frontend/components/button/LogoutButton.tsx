/** Icon-only logout button. */

import { cn } from "@/lib/utils"
import { LogOut } from "lucide-react"

interface LogoutButtonProps {
  handleLogout: () => void
  disabled?: boolean
  className?: string
}

export function LogoutButton({ handleLogout, disabled, className }: LogoutButtonProps) {
  return (
    <button
      onClick={handleLogout}
      disabled={disabled}
      className={cn(
        "p-2 rounded-full",
        "text-muted hover:text-white",
        "hover:bg-white/10",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      aria-label="Logout"
    >
      <LogOut className="w-4 h-4" />
    </button>
  )
}
