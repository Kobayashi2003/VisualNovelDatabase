/** VN appearances list on the character page, grouped by role badge. */
"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { enumLabel, CHARACTER_ROLE_CLASS } from "@/lib/enums"
import { useSearchContext } from "@/context/SearchContext"
import { displayTitle } from "@/lib/original"
import type { Character } from "@/lib/types"

type CharVN = Character["vns"][number]

const ROLE_ORDER = ["main", "primary", "side", "appears"] as const

interface CharacterVNsProps {
  vns: CharVN[]
}

export function CharacterVNs({ vns }: CharacterVNsProps) {
  const { showOriginal } = useSearchContext()
  const sorted = [...vns].sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a.role as typeof ROLE_ORDER[number])
    const bi = ROLE_ORDER.indexOf(b.role as typeof ROLE_ORDER[number])
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map((entry, i) => (
        <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-white/5 last:border-0">
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5",
            CHARACTER_ROLE_CLASS[entry.role] ?? "bg-white/10 text-white/60"
          )}>
            {enumLabel('CHARACTER_ROLE', entry.role)}
          </span>
          <div className="flex-1 min-w-0">
            <Link
              href={`/${entry.id}`}
              className="text-sm text-white/90 hover:text-accent transition-colors leading-snug"
            >
              {displayTitle(entry, showOriginal)}
            </Link>
            {entry.release && (
              <p className="text-xs text-muted mt-0.5 truncate">
                <Link href={`/${entry.release.id}`} className="hover:text-white/70 transition-colors">
                  {displayTitle(entry.release, showOriginal)}
                </Link>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
