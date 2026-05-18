/** Pill-shaped skeleton placeholder used while a button's content is loading. */

import { cn } from "@/lib/utils"

interface GhostButtonProps {
  className?: string
}

export function GhostButton({ className }: GhostButtonProps) {
  return (
    <div className={cn(
      "h-8 w-20 rounded-full",
      "bg-white/5 animate-pulse",
      className
    )} />
  )
}
