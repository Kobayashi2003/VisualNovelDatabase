/** Expanded characters view: replaces the VN page's main column with a single
 *  vertical column of dense character cards, grouped by role from most to least
 *  important. Opened from the Characters section header. */
"use client"

import { useEffect } from "react"
import { ChevronLeft } from "lucide-react"
import { enumLabel } from "@/lib/enums"
import { useSpoilerLevel } from "@/hooks/useSpoilerLevel"
import { VNCharacterCard } from "./VNCharacterCard"
import type { VN } from "@/lib/types"

type VNCharacter = VN["characters"][number]

const ROLE_ORDER = ["main", "primary", "side", "appears"] as const

interface VNCharactersPanelProps {
  characters: VNCharacter[]
  sexualLevel: string
  violenceLevel: string
  /** Scroll this character's card into view on open (from a slide card). */
  focusId?: string | null
  onClose: () => void
}

export function VNCharactersPanel({ characters, sexualLevel, violenceLevel, focusId, onClose }: VNCharactersPanelProps) {
  const getRole = (c: VNCharacter): string => c.vns[0]?.role ?? "appears"
  const getSpoiler = (c: VNCharacter): number => c.vns[0]?.spoiler ?? 0

  const spoiler = useSpoilerLevel(
    characters.some(c => getSpoiler(c) === 1),
    characters.some(c => getSpoiler(c) === 2),
  )

  const visible = characters.filter(c => getSpoiler(c) <= spoiler.spoilerLevel)
  const hidden = characters.length - visible.length

  // Bucket by role, then order the buckets most → least important.
  const byRole = new Map<string, VNCharacter[]>()
  for (const c of visible) {
    const role = getRole(c)
    const arr = byRole.get(role) ?? []
    arr.push(c)
    byRole.set(role, arr)
  }
  const orderedRoles = [
    ...ROLE_ORDER.filter(r => byRole.has(r)),
    ...[...byRole.keys()].filter(r => !ROLE_ORDER.includes(r as typeof ROLE_ORDER[number])).sort(),
  ]

  // Jump to the requested character's card when opened from a slide card.
  useEffect(() => {
    if (!focusId) return
    document.getElementById(`vnchar-${focusId}`)?.scrollIntoView({ block: "start" })
  }, [focusId])

  return (
    <div className="flex flex-col gap-6">
      {/* Header: back + title + spoiler toggle */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm font-bold text-white uppercase tracking-wider hover:text-accent transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Characters
          <span className="text-xs font-normal text-muted normal-case tracking-normal">{characters.length}</span>
        </button>
        {spoiler.hasAnySpoilers && (
          <button
            onClick={spoiler.cycle}
            className="text-xs text-muted hover:text-white transition-colors shrink-0"
          >
            {spoiler.buttonLabel}
          </button>
        )}
      </div>

      {orderedRoles.map(role => (
        <div key={role} className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            {enumLabel('CHARACTER_ROLE', role)}
            <span className="ml-2 text-muted/60">{byRole.get(role)!.length}</span>
          </p>
          {byRole.get(role)!.map(c => (
            <div key={c.id} id={`vnchar-${c.id}`} className="scroll-mt-4">
              <VNCharacterCard
                base={c}
                role={role}
                sexualLevel={sexualLevel}
                violenceLevel={violenceLevel}
                spoilerLevel={spoiler.spoilerLevel}
              />
            </div>
          ))}
        </div>
      ))}

      {hidden > 0 && spoiler.hasAnySpoilers && (
        <button
          onClick={spoiler.cycle}
          className="self-start text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          +{hidden} hidden spoiler character{hidden !== 1 ? "s" : ""} — click to reveal
        </button>
      )}
    </div>
  )
}
