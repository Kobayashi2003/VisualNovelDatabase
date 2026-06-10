/** Unified platform display: icon(s) with a tooltip carrying the platform name.
 *  Falls back to plain muted text when no sprite exists for the code. */
"use client"

import { cn } from "@/lib/utils"
import { ICON } from "@/lib/icons"
import { enumLabel } from "@/lib/enums"
import { Tooltip } from "./Tooltip"

const PLAT_ICON = ICON.PLATFORM as Record<string, string>

interface PlatformIconsProps {
  platforms: string[]
  className?: string
  /** Extra classes on each icon sprite (e.g. the muted small variant used in
   *  release rows). */
  iconClassName?: string
}

export function PlatformIcons({ platforms, className, iconClassName }: PlatformIconsProps) {
  if (platforms.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {platforms.map(p => {
        const iconClass = PLAT_ICON[p]
        const name = enumLabel("PLATFORM", p)
        return (
          <Tooltip key={p} label={name}>
            {iconClass
              ? <span className={cn(iconClass, iconClassName)} />
              : <span className="text-xs text-muted">{name}</span>}
          </Tooltip>
        )
      })}
    </div>
  )
}
