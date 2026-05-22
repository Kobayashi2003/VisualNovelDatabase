/** Round icon-only button — the shared base for every circular icon button.
 *  An optional `tooltip` is rendered through the portalled `Tooltip`. */
"use client"

import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/common/Tooltip"

interface IconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  tooltip?: string
  /** Accessible label; falls back to `tooltip` when omitted. */
  ariaLabel?: string
  className?: string
}

export function IconButton({ icon, onClick, disabled, tooltip, ariaLabel, className }: IconButtonProps) {
  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? tooltip}
      className={cn(
        "p-2 rounded-full",
        "text-muted hover:text-white",
        "hover:bg-white/10",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      {icon}
    </button>
  )

  return tooltip ? <Tooltip label={tooltip}>{button}</Tooltip> : button
}
