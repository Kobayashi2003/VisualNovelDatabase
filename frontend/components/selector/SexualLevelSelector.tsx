/** Tri-state selector for the sexual-content tolerance (safe / suggestive / explicit). */

import type { SexualLevel } from "@/lib/types"
import { Segmented, type SegmentedOption } from "./Segmented"

const LEVELS: SegmentedOption<SexualLevel>[] = [
  { value: "safe", label: "Safe", short: "Safe" },
  { value: "suggestive", label: "Suggestive", short: "Sugg", activeClass: "bg-yellow-500/80 text-white" },
  { value: "explicit", label: "Explicit", short: "Expl", activeClass: "bg-red-500/80 text-white" },
]

interface SexualLevelSelectorProps {
  sexualLevel: SexualLevel
  setSexualLevel: (level: SexualLevel) => void
  className?: string
}

export function SexualLevelSelector({ sexualLevel, setSexualLevel, className }: SexualLevelSelectorProps) {
  return <Segmented value={sexualLevel} onChange={setSexualLevel} options={LEVELS} className={className} />
}
