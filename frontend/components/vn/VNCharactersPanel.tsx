/** Expanded characters view: replaces the VN page's main column with a single
 *  vertical column of dense character cards, grouped by role from most to least
 *  important. Opened from the Characters section header. */
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { enumLabel } from "@/lib/enums"
import { characterRole, characterSpoiler } from "@/lib/characters"
import { useSpoilerLevel } from "@/hooks/useSpoilerLevel"
import { VNCharacterCard } from "./VNCharacterCard"
import type { VN } from "@/lib/types"

type VNCharacter = VN["characters"][number]

const ROLE_ORDER = ["main", "primary", "side", "appears"] as const

interface VNCharactersPanelProps {
  /** The VN being viewed — selects each character's role/spoiler entry. */
  vnId: string
  characters: VNCharacter[]
  sexualLevel: string
  violenceLevel: string
  /** Scroll this character's card into view on open (from a slide card). */
  focusId?: string | null
  onClose: () => void
}

export function VNCharactersPanel({ vnId, characters, sexualLevel, violenceLevel, focusId, onClose }: VNCharactersPanelProps) {
  const getRole = (c: VNCharacter): string => characterRole(c, vnId)
  const getSpoiler = (c: VNCharacter): number => characterSpoiler(c, vnId)

  // Spoiler *traits* live only in each character's lazily-fetched full payload,
  // which the cards already load. They report it up so the global toggle can
  // appear even when no character is a spoiler by role.
  const traitFlags = useRef(new Map<string, { minor: boolean; major: boolean }>())
  const [traitMinor, setTraitMinor] = useState(false)
  const [traitMajor, setTraitMajor] = useState(false)
  const reportSpoilerTraits = useCallback((id: string, minor: boolean, major: boolean) => {
    const prev = traitFlags.current.get(id)
    if (prev && prev.minor === minor && prev.major === major) return
    traitFlags.current.set(id, { minor, major })
    let m = false, M = false
    for (const v of traitFlags.current.values()) { m = m || v.minor; M = M || v.major }
    setTraitMinor(m)
    setTraitMajor(M)
  }, [])

  const spoiler = useSpoilerLevel(
    characters.some(c => getSpoiler(c) === 1) || traitMinor,
    characters.some(c => getSpoiler(c) === 2) || traitMajor,
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

  /* ── Render ────────────────────────────────────────────────────────────── */

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
            className={cn("text-xs transition-colors shrink-0", spoiler.buttonColor)}
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
                vnId={vnId}
                base={c}
                role={role}
                sexualLevel={sexualLevel}
                violenceLevel={violenceLevel}
                spoilerLevel={spoiler.spoilerLevel}
                onSpoilerTraits={reportSpoilerTraits}
              />
            </div>
          ))}
        </div>
      ))}

      {hidden > 0 && spoiler.hasAnySpoilers && (
        <button
          onClick={spoiler.cycle}
          className={cn("self-start text-xs transition-colors", spoiler.buttonColor)}
        >
          +{hidden} hidden spoiler character{hidden !== 1 ? "s" : ""} — click to reveal
        </button>
      )}
    </div>
  )
}
