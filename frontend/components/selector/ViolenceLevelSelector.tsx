/** Tri-state selector for the violence-content tolerance (tame / violent / brutal). */

import type { ViolenceLevel } from "@/lib/types"
import { Segmented, type SegmentedOption } from "./Segmented"

const LEVELS: SegmentedOption<ViolenceLevel>[] = [
  { value: "tame", label: "Tame", short: "Tame" },
  { value: "violent", label: "Violent", short: "Viol", activeClass: "bg-orange-500/80 text-white" },
  { value: "brutal", label: "Brutal", short: "Brut", activeClass: "bg-red-800/80 text-white" },
]

interface ViolenceLevelSelectorProps {
  violenceLevel: ViolenceLevel
  setViolenceLevel: (level: ViolenceLevel) => void
  className?: string
}

export function ViolenceLevelSelector({ violenceLevel, setViolenceLevel, className }: ViolenceLevelSelectorProps) {
  return <Segmented value={violenceLevel} onChange={setViolenceLevel} options={LEVELS} className={className} />
}
