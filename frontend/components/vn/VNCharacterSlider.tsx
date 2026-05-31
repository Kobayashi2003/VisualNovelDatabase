/** One-card-at-a-time view of a VN's (already role/spoiler-filtered) characters.
 *  The card spans the section's full width and is height-clamped; navigation sits
 *  in a compact row beneath it. Tapping the truncation fade jumps to the same
 *  character in the expanded view. */
"use client"

import { useCallback, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { VNCharacterCard } from "./VNCharacterCard"
import type { VN } from "@/lib/types"

type VNCharacter = VN["characters"][number]

interface VNCharacterSliderProps {
  characters: VNCharacter[]
  sexualLevel: string
  violenceLevel: string
  spoilerLevel: 0 | 1 | 2
  onExpand?: (charId: string) => void
}

const ARROW_CLASS =
  "flex items-center justify-center w-9 h-9 rounded-full text-muted hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"

export function VNCharacterSlider({ characters, sexualLevel, violenceLevel, spoilerLevel, onExpand }: VNCharacterSliderProps) {
  const [index, setIndex] = useState(0)
  const total = characters.length

  // Snap back to the first card whenever the filtered list changes (role/spoiler).
  // Done during render (not in an effect) so the index never points at a stale card.
  const [trackedChars, setTrackedChars] = useState(characters)
  if (trackedChars !== characters) {
    setTrackedChars(characters)
    setIndex(0)
  }

  const go = useCallback((delta: number) => {
    setIndex(i => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)))
  }, [total])

  if (total === 0) return null

  const safeIndex = Math.min(index, total - 1)
  const current = characters[safeIndex]
  const role = current.vns[0]?.role ?? "appears"

  return (
    <div className="flex flex-col gap-3">
      {/* Full-width, height-clamped card */}
      <VNCharacterCard
        key={current.id}
        base={current}
        role={role}
        sexualLevel={sexualLevel}
        violenceLevel={violenceLevel}
        spoilerLevel={spoilerLevel}
        clamp
        onExpand={onExpand ? () => onExpand(current.id) : undefined}
      />

      {/* Navigation row */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => go(-1)} disabled={safeIndex <= 0} aria-label="Previous character" className={ARROW_CLASS}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs text-muted tabular-nums select-none">{safeIndex + 1} / {total}</span>
        <button onClick={() => go(1)} disabled={safeIndex >= total - 1} aria-label="Next character" className={ARROW_CLASS}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
