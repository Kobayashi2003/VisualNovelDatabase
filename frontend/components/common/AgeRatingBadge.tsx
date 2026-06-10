/** Age-rating badge for release rows and info panels. Color encodes severity
 *  (green all-ages → red 18+); fuchsia marks an uncensored release, with a
 *  tooltip spelling that out. `chip` is the pill used in release lists; `text`
 *  is the plain colored label used in the release info panel. */

import { cn } from "@/lib/utils"
import { Tooltip } from "./Tooltip"

// Severity → color, shared by both variants (chip = pill fill, text = plain).
function toneClass(minage: number, uncensored: boolean | null | undefined, variant: "chip" | "text"): string {
  const chip = variant === "chip"
  if (uncensored)   return chip ? "bg-fuchsia-500/15 text-fuchsia-400" : "text-fuchsia-400"
  if (minage === 0) return chip ? "bg-green-500/15 text-green-400"     : "text-green-400"
  if (minage >= 18) return chip ? "bg-red-500/15 text-red-400"         : "text-red-400"
  if (minage >= 17) return chip ? "bg-orange-500/15 text-orange-400"   : "text-orange-400"
  if (minage >= 15) return chip ? "bg-yellow-500/15 text-yellow-400"   : "text-yellow-400"
  return chip ? "bg-white/10 text-white/60" : "text-white/80"
}

interface AgeRatingBadgeProps {
  minage: number | null | undefined
  uncensored?: boolean | null
  variant?: "chip" | "text"
}

export function AgeRatingBadge({ minage, uncensored, variant = "chip" }: AgeRatingBadgeProps) {
  if (minage == null) return null
  const label = minage === 0 ? "All Ages" : `${minage}+`

  const badge = (
    <span className={cn(
      "text-xs font-medium shrink-0",
      variant === "chip" && "px-1.5 py-0.5 rounded",
      toneClass(minage, uncensored, variant),
    )}>
      {label}
    </span>
  )

  return uncensored ? <Tooltip label="Uncensored">{badge}</Tooltip> : badge
}
