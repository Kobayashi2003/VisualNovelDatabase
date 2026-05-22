/** Spoiler-level state machine shared by the VN tag/character grids and the
 *  character page. Cycles 0 → minor → major → 0, skipping levels that have no
 *  spoilers to reveal. */
"use client"

import { useState } from "react"

export type SpoilerLevel = 0 | 1 | 2

export interface SpoilerControl {
  spoilerLevel: SpoilerLevel
  setSpoilerLevel: (level: SpoilerLevel) => void
  /** True when there is at least one minor or major spoiler to reveal. */
  hasAnySpoilers: boolean
  /** Advance to the next meaningful spoiler level. */
  cycle: () => void
  /** Label for the cycle button at the current level. */
  buttonLabel: string
}

export function useSpoilerLevel(hasMinorSpoilers: boolean, hasMajorSpoilers: boolean): SpoilerControl {
  const [spoilerLevel, setSpoilerLevel] = useState<SpoilerLevel>(0)

  const next = (): SpoilerLevel => {
    if (spoilerLevel === 0) return hasMinorSpoilers ? 1 : 2
    if (spoilerLevel === 1) return hasMajorSpoilers ? 2 : 0
    return 0
  }

  const buttonLabel =
    spoilerLevel === 0 ? "Show minor spoilers"
    : spoilerLevel === 1 ? (hasMajorSpoilers ? "Show major spoilers" : "Hide spoilers")
    : "Hide spoilers"

  return {
    spoilerLevel,
    setSpoilerLevel,
    hasAnySpoilers: hasMinorSpoilers || hasMajorSpoilers,
    cycle: () => setSpoilerLevel(next()),
    buttonLabel,
  }
}
