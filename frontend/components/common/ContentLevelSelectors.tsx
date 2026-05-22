/** The sexual + violence content-level selector pair, shown together on every
 *  page that filters by content rating. */

import { cn } from "@/lib/utils"
import type { SexualLevel, ViolenceLevel } from "@/lib/types"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"

interface ContentLevelSelectorsProps {
  sexualLevel: SexualLevel
  setSexualLevel: (v: SexualLevel) => void
  violenceLevel: ViolenceLevel
  setViolenceLevel: (v: ViolenceLevel) => void
  /** `row` lays the two selectors side-by-side (each grows equally); `col` stacks them. */
  direction?: "row" | "col"
  className?: string
}

export function ContentLevelSelectors({
  sexualLevel, setSexualLevel, violenceLevel, setViolenceLevel,
  direction = "col", className,
}: ContentLevelSelectorsProps) {
  const row = direction === "row"
  const itemClass = row ? "flex-1" : undefined

  return (
    <div className={cn("flex gap-2", row ? "flex-row" : "flex-col", className)}>
      <SexualLevelSelector sexualLevel={sexualLevel} setSexualLevel={setSexualLevel} className={itemClass} />
      <ViolenceLevelSelector violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel} className={itemClass} />
    </div>
  )
}
