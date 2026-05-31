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
  /** Severity the cycle button will reveal next: "minor" (yellow), "major"
   *  (orange), or "none" when the next step only hides. */
  buttonTone: "minor" | "major" | "none"
  /** Tailwind text classes matching `buttonTone`, for the toggle/hint colour. */
  buttonColor: string
}

export function useSpoilerLevel(hasMinorSpoilers: boolean, hasMajorSpoilers: boolean): SpoilerControl {
  const [spoilerLevel, setSpoilerLevel] = useState<SpoilerLevel>(0)

  const next = (): SpoilerLevel => {
    if (spoilerLevel === 0) return hasMinorSpoilers ? 1 : 2
    if (spoilerLevel === 1) return hasMajorSpoilers ? 2 : 0
    return 0
  }

  // Severity of what the *next* click reveals — drives both the label and the
  // colour. At level 0 we usually reveal minor, but jump straight to major when
  // there are no minor spoilers at all.
  const buttonTone: "minor" | "major" | "none" =
    spoilerLevel === 0 ? (hasMinorSpoilers ? "minor" : "major")
    : (spoilerLevel === 1 && hasMajorSpoilers) ? "major"
    : "none"

  const buttonLabel =
    buttonTone === "minor" ? "Show minor spoilers"
    : buttonTone === "major" ? "Show major spoilers"
    : "Hide spoilers"

  const buttonColor =
    buttonTone === "minor" ? "text-yellow-400 hover:text-yellow-300"
    : buttonTone === "major" ? "text-orange-400 hover:text-orange-300"
    : "text-muted hover:text-white"

  return {
    spoilerLevel,
    setSpoilerLevel,
    hasAnySpoilers: hasMinorSpoilers || hasMajorSpoilers,
    cycle: () => setSpoilerLevel(next()),
    buttonLabel,
    buttonTone,
    buttonColor,
  }
}
