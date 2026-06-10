/** Releases section on the VN page, grouped by language and expandable. */
"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { enumMap } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { useSearchContext } from "@/context/SearchContext"
import { displayTitle, displayName } from "@/lib/original"
import { AgeRatingBadge } from "@/components/common/AgeRatingBadge"
import { MediaIcons } from "@/components/common/MediaIcons"
import { PlatformIcons } from "@/components/common/PlatformIcons"
import type { VN } from "@/lib/types"

type VNRelease = NonNullable<VN["releases"]>[number]

interface VNReleasesProps {
  releases: VNRelease[]
  olang?: string
}

export function VNReleases({ releases, olang }: VNReleasesProps) {
  const LANGUAGE = enumMap('LANGUAGE')
  const LANG_ICON = ICON.LANGUAGE as Record<string, string>
  const { showOriginal } = useSearchContext()

  // Group by primary language
  const groups = new Map<string, VNRelease[]>()
  const NO_LANG = "__none__"
  for (const r of releases) {
    const mainLang = r.languages?.find(l => l.main)?.lang ?? r.languages?.[0]?.lang ?? NO_LANG
    const arr = groups.get(mainLang) ?? []
    arr.push(r)
    groups.set(mainLang, arr)
  }

  // Sort releases within each group by date
  for (const [, arr] of groups) {
    arr.sort((a, b) => (a.released ?? "").localeCompare(b.released ?? ""))
  }

  // Collapsed state: by default collapse all except olang
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const lang of groups.keys()) {
      if (lang !== olang) s.add(lang)
    }
    return s
  })

  const toggle = (lang: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(lang)) next.delete(lang)
      else next.add(lang)
      return next
    })
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-3">
      {[...groups.entries()].map(([lang, groupReleases]) => {
        const isOpen = !collapsed.has(lang)
        const langLabel = lang === NO_LANG ? "Unknown language" : (LANGUAGE[lang] ?? lang)
        const iconClass = lang !== NO_LANG ? (LANG_ICON[lang] ?? "") : ""

        return (
          <div key={lang} className="rounded-lg border border-white/5 overflow-hidden">
            <button
              onClick={() => toggle(lang)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-elevated hover:bg-white/5 transition-colors"
            >
              {iconClass && <span className={iconClass} />}
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider flex-1 text-left">
                {langLabel}
              </span>
              <span className="text-xs text-muted mr-1">{groupReleases.length}</span>
              {isOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
              }
            </button>

            {isOpen && groupReleases.map((r, i) => {
              const isMtl = r.languages?.find(l => l.main)?.mtl
              const dimRow = isMtl || !r.official
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5",
                    i % 2 === 0 ? "bg-surface" : "bg-background/40",
                    dimRow && "opacity-60"
                  )}
                >
                  <span className="text-xs text-muted w-24 shrink-0 pt-0.5 font-mono">
                    {r.released ?? "TBA"}
                  </span>

                  <AgeRatingBadge minage={r.minage} uncensored={r.uncensored} />

                  <div className="flex-1 min-w-0">
                    <Link href={`/${r.id}`} className="text-sm text-white/90 hover:text-accent transition-colors truncate block">
                      {displayTitle(r, showOriginal)}
                      {r.patch && <span className="text-muted ml-1">(patch)</span>}
                    </Link>
                    {r.producers && r.producers.length > 0 && (
                      <p className="text-xs text-muted truncate mt-0.5">
                        {r.producers.map((p, i) => (
                          <span key={p.id}>
                            {i > 0 && " · "}
                            <span>
                              {displayName(p, showOriginal)}
                            </span>
                            {p.developer && !p.publisher && " (dev)"}
                            {p.publisher && !p.developer && " (pub)"}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>

                  {r.media && r.media.length > 0 && (
                    <MediaIcons media={r.media} className="pt-0.5" />
                  )}

                  {r.platforms && r.platforms.length > 0 && (
                    <PlatformIcons
                      platforms={r.platforms}
                      className="gap-1 shrink-0 justify-end pt-0.5"
                      iconClassName="text-muted text-sm"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
