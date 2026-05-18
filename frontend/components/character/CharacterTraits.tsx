/** Traits panel on the character page — groups + spoiler reveal buttons. */
"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { ICON } from "@/lib/icons"
import type { Character } from "@/lib/types"

type Trait = Character["traits"][number]

// VNDB's canonical group ordering; unknown groups fall through alphabetically.
const GROUP_ORDER = [
  "Hair", "Eyes", "Body", "Clothes", "Items", "Accessories",
  "Personality", "Role", "Engages in", "Engages in (Sexual)",
  "Subject of", "Subject of (Sexual)",
]

const SEX_LABEL: Record<string, string> = {
  m: "Male", f: "Female", b: "Both", n: "Unknown", o: "Other", u: "Unknown",
}

interface CharacterTraitsProps {
  traits: Trait[]
  spoilerLevel: 0 | 1 | 2
  sexualLevel: string
  sex?: string
  onRevealMinor: () => void
  onRevealMajor: () => void
}

export function CharacterTraits({ traits, spoilerLevel, sexualLevel, sex, onRevealMinor, onRevealMajor }: CharacterTraitsProps) {
  const SEXUAL_GROUPS = ["Engages in (Sexual)", "Subject of (Sexual)"]
  const isExplicit = sexualLevel === "explicit"

  // Filter out sexual groups if not explicit, then apply spoiler filter
  const filteredTraits = traits.filter(t => {
    if (SEXUAL_GROUPS.includes(t.group_name ?? "") && !isExplicit) return false
    return true
  })

  // Separate visible vs hidden by spoiler level
  const visible = filteredTraits.filter(t => t.spoiler <= spoilerLevel)
  const hiddenMinor = filteredTraits.filter(t => t.spoiler === 1 && spoilerLevel < 1).length
  const hiddenMajor = filteredTraits.filter(t => t.spoiler === 2 && spoilerLevel < 2).length

  // Group visible traits
  const groupMap = new Map<string, Trait[]>()
  for (const t of visible) {
    const grp = t.group_name ?? "Other"
    const arr = groupMap.get(grp) ?? []
    arr.push(t)
    groupMap.set(grp, arr)
  }

  // Sort groups: predefined order first, then alphabetical remainder
  const allGroups = [...groupMap.keys()]
  const sortedGroups = [
    ...GROUP_ORDER.filter(g => groupMap.has(g)),
    ...allGroups.filter(g => !GROUP_ORDER.includes(g)).sort(),
  ]

  const noTraits = sortedGroups.length === 0 && hiddenMinor === 0 && hiddenMajor === 0

  return (
    <div className="flex flex-col gap-3">
      {/* Sex indicator */}
      {sex && (ICON.CHARACTER_SEX as Record<string, string>)[sex] && (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            (ICON.CHARACTER_SEX as Record<string, string>)[sex],
            "charsex-" + sex
          )} />
          <span className="text-xs text-muted">{SEX_LABEL[sex] ?? sex}</span>
        </div>
      )}
      {noTraits && <p className="text-xs text-muted italic">No traits listed.</p>}
      {sortedGroups.map(grp => {
        const grpTraits = groupMap.get(grp)!
        return (
          <div key={grp}>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{grp}</p>
            <div className="flex flex-wrap gap-1.5">
              {grpTraits.map(t => (
                <Link
                  key={t.id}
                  href={`/${t.id}`}
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs transition-colors",
                    t.lie
                      ? "bg-white/5 text-muted line-through hover:bg-white/10"
                      : "bg-white/10 text-white/90 hover:bg-white/20",
                    t.spoiler === 1 && "border border-yellow-500/30",
                    t.spoiler === 2 && "border border-orange-500/40"
                  )}
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      {/* Spoiler reveal hints */}
      {(hiddenMinor > 0 || hiddenMajor > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {hiddenMinor > 0 && (
            <button
              onClick={onRevealMinor}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors border border-yellow-500/20"
            >
              +{hiddenMinor} minor spoiler trait{hiddenMinor !== 1 ? "s" : ""}
            </button>
          )}
          {hiddenMajor > 0 && (
            <button
              onClick={onRevealMajor}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
            >
              +{hiddenMajor} major spoiler trait{hiddenMajor !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
