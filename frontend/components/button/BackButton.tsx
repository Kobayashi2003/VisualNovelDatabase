/** Circular back-chevron button. */

import { ChevronLeft } from "lucide-react"
import { IconButton } from "./IconButton"

interface BackButtonProps {
  handleBack: () => void
  className?: string
}

export function BackButton({ handleBack, className }: BackButtonProps) {
  return (
    <IconButton
      icon={<ChevronLeft className="w-5 h-5" />}
      onClick={handleBack}
      ariaLabel="Go back"
      className={className}
    />
  )
}
