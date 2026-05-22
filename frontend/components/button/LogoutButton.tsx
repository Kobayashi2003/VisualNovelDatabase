/** Icon-only logout button. */

import { LogOut } from "lucide-react"
import { IconButton } from "./IconButton"

interface LogoutButtonProps {
  handleLogout: () => void
  disabled?: boolean
  className?: string
}

export function LogoutButton({ handleLogout, disabled, className }: LogoutButtonProps) {
  return (
    <IconButton
      icon={<LogOut className="w-4 h-4" />}
      onClick={handleLogout}
      disabled={disabled}
      ariaLabel="Logout"
      className={className}
    />
  )
}
