/** Physical-media icons for release rows, each with a tooltip carrying the
 *  medium name (and quantity when above one). Renders nothing for media whose
 *  code has no sprite. */
"use client"

import { cn } from "@/lib/utils"
import { ICON } from "@/lib/icons"
import { enumMap } from "@/lib/enums"
import { Tooltip } from "./Tooltip"

const MEDIA_ICON = ICON.RELEASE_MEDIA as Record<string, string>

interface MediaIconsProps {
  media: Array<{ medium: string; qty?: number | null }>
  className?: string
}

export function MediaIcons({ media, className }: MediaIconsProps) {
  if (media.length === 0) return null
  const MEDIUM = enumMap("MEDIUM")

  return (
    <div className={cn("flex flex-wrap gap-1 shrink-0 justify-end", className)}>
      {media.map((m, idx) => {
        const iconClass = MEDIA_ICON[m.medium]
        if (!iconClass) return null
        const name = MEDIUM[m.medium] ?? m.medium
        const label = m.qty && m.qty > 1 ? `${name} ×${m.qty}` : name
        return (
          <Tooltip key={`${m.medium}-${idx}`} label={label}>
            <span className={cn(iconClass, "text-muted text-sm")} />
          </Tooltip>
        )
      })}
    </div>
  )
}
