/** Search icon submit button used inside the header search bar. */

import { Search } from "lucide-react"
import { IconButton } from "./IconButton"

interface SubmitButtonProps {
  handleSubmit: () => void
  disabled?: boolean
  className?: string
}

export function SubmitButton({ handleSubmit, disabled, className }: SubmitButtonProps) {
  return (
    <IconButton
      icon={<Search className="w-4 h-4" />}
      onClick={handleSubmit}
      disabled={disabled}
      ariaLabel="Search"
      className={className}
    />
  )
}
