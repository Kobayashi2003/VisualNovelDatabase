"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ENUMS } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { useSearchContext } from "@/context/SearchContext"
import type { VN } from "@/lib/types"

type VNRelease = NonNullable<VN["releases"]>[number]

interface VNReleasesProps {
  releases: VNRelease[]
  olang?: string
}

export function VNReleases({ releases, olang }: VNReleasesProps) {
  const LANGUAGE = ENUMS.LANGUAGE as Record<string, string>
  const PLATFORM = ENUMS.PLATFORM as Record<string, string>
  const RTYPE = ENUMS.RTYPE as Record<string, string>
  const LANG_ICON = ICON.LANGUAGE as Record<string, string>
  const PLAT_ICON = ICON.PLATFORM as Record<string, string>
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
              const rtype = r.vns[0]?.rtype
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5",
                    i % 2 === 0 ? "bg-surface" : "bg-background/40",
                    (r.official === false || r.languages?.find(l => l.main)?.mtl) && "opacity-60"
                  )}
                >
                  <span className="text-xs text-muted w-24 shrink-0 pt-0.5 font-mono">
                    {r.released ?? "TBA"}
                  </span>

                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-medium shrink-0",
                    rtype === "complete" ? "bg-green-500/15 text-green-400" :
                    rtype === "trial" ? "bg-blue-500/15 text-blue-400" :
                    "bg-white/10 text-white/60"
                  )}>
                    {RTYPE[rtype ?? ""] ?? rtype ?? "?"}
                  </span>

                  {r.platforms && r.platforms.length > 0 && (
                    <div className="flex gap-1 shrink-0 flex-wrap pt-0.5">
                      {r.platforms.map(p => (
                        PLAT_ICON[p]
                          ? <span key={p} className={PLAT_ICON[p]} title={PLATFORM[p] ?? p} />
                          : <span key={p} title={PLATFORM[p] ?? p} className="text-xs text-muted">{p}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {(() => {
                      const mainLangEntry = r.languages?.find(l => l.main)
                      const origTitle = mainLangEntry?.title
                      const displayTitle = showOriginal && origTitle ? origTitle : r.title
                      return (
                        <Link href={`/${r.id}`} className="text-sm text-white/90 hover:text-accent transition-colors truncate block">
                          {displayTitle}
                        </Link>
                      )
                    })()}
                    {r.producers && r.producers.length > 0 && (
                      <p className="text-xs text-muted truncate mt-0.5">
                        {r.producers.map((p, i) => (
                          <span key={p.id}>
                            {i > 0 && " · "}
                            <span>
                              {showOriginal && p.original ? p.original : p.name}
                            </span>
                            {p.developer && !p.publisher && " (dev)"}
                            {p.publisher && !p.developer && " (pub)"}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
