/** Releases section for the Producer detail page. Flat / by-language / by-VN grouping. */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { enumMap } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { api } from "@/lib/api"
import { PAGE_LIMIT } from "@/lib/constants"
import { displayTitle, displayName } from "@/lib/original"
import type { Release_Small } from "@/lib/types"
import { useSearchContext } from "@/context/SearchContext"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"

type GroupBy = "all" | "language" | "vn"

interface ProducerReleasesProps {
  producerId: string
  producerLang?: string
  onCountLoaded?: (count: number) => void
}

/* ─── Individual release row ───────────────────────────────────────────────── */

interface ReleaseRowProps {
  release: Release_Small
  producerId: string
  index: number
  showOriginal: boolean
  RTYPE: Record<string, string>
  LANG_ICON: Record<string, string>
  PLAT_ICON: Record<string, string>
}

function ReleaseRow({ release: r, producerId, index, showOriginal, RTYPE, LANG_ICON, PLAT_ICON }: ReleaseRowProps) {
  const rtype = r.vns[0]?.rtype
  const myEntry = r.producers?.find(p => p.id === producerId)
  const isDev = myEntry?.developer ?? false
  const isPub = myEntry?.publisher ?? false
  const roleLabel = isDev && isPub ? "D&P" : isDev ? "Dev" : isPub ? "Pub" : null

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5",
        index % 2 === 0 ? "bg-surface" : "bg-background/40",
        r.languages?.find(l => l.main)?.mtl && "opacity-60"
      )}
    >
      <span className="text-xs text-muted w-24 shrink-0 font-mono">
        {r.released ?? "TBA"}
      </span>

      <div className="w-16 flex gap-0.5 shrink-0 justify-end">
        {r.languages?.map(l => LANG_ICON[l.lang]
          ? <span key={l.lang} className={cn(LANG_ICON[l.lang], "text-sm")} title={l.lang} />
          : null
        )}
      </div>

      <span className={cn(
        "text-xs px-1.5 py-0.5 rounded font-medium shrink-0",
        rtype === "complete" ? "bg-green-500/15 text-green-400" :
        rtype === "trial"    ? "bg-blue-500/15 text-blue-400" :
                               "bg-white/10 text-white/60"
      )}>
        {RTYPE[rtype ?? ""] ?? rtype ?? "?"}
      </span>

      {roleLabel && (
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded font-medium shrink-0",
          isDev && isPub ? "bg-purple-500/15 text-purple-400"
            : isDev      ? "bg-amber-500/15 text-amber-400"
                         : "bg-sky-500/15 text-sky-400"
        )}>
          {roleLabel}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <Link href={`/${r.id}`} className="text-sm text-white/90 hover:text-accent transition-colors truncate block">
          {displayTitle(r, showOriginal)}
        </Link>
      </div>

      {r.platforms && r.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1 shrink-0 justify-end pt-0.5">
          {r.platforms.map(plat => (
            <span key={plat} className={cn(PLAT_ICON[plat] ?? "", "text-muted text-sm")} title={plat} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Collapsible group ────────────────────────────────────────────────────── */

interface GroupSectionProps {
  groupKey: string
  header: React.ReactNode
  count: number
  releases: Release_Small[]
  producerId: string
  showOriginal: boolean
  RTYPE: Record<string, string>
  LANG_ICON: Record<string, string>
  PLAT_ICON: Record<string, string>
  defaultCollapsed?: boolean
}

function GroupSection({ groupKey, header, count, releases, producerId, showOriginal, RTYPE, LANG_ICON, PLAT_ICON, defaultCollapsed }: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false)

  return (
    <div className="rounded-lg border border-white/5 overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-elevated hover:bg-white/5 transition-colors"
      >
        {header}
        <span className="text-xs text-muted mr-1">{count}</span>
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
          : <ChevronDown  className="w-3.5 h-3.5 text-muted shrink-0" />
        }
      </button>
      {!collapsed && releases.map((r, i) => (
        <ReleaseRow
          key={`${groupKey}-${r.id}`}
          release={r} producerId={producerId} index={i}
          showOriginal={showOriginal} RTYPE={RTYPE} LANG_ICON={LANG_ICON} PLAT_ICON={PLAT_ICON}
        />
      ))}
    </div>
  )
}

/* ─── Main component ───────────────────────────────────────────────────────── */

export function ProducerReleases({ producerId, producerLang, onCountLoaded }: ProducerReleasesProps) {
  const [releases, setReleases] = useState<Release_Small[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>("all")

  const LANGUAGE = enumMap('LANGUAGE')
  const RTYPE    = enumMap('RTYPE')
  const LANG_ICON = ICON.LANGUAGE as Record<string, string>
  const PLAT_ICON = ICON.PLATFORM  as Record<string, string>
  const { showOriginal } = useSearchContext()

  // Reset groupBy when producer changes
  useEffect(() => {
    setGroupBy("all")
  }, [producerId])

  // Fetch all releases by paginating until exhausted
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setReleases([])

    async function fetchAll() {
      const first = await api.small.release({ producer: producerId, sort: "released", reverse: true, limit: PAGE_LIMIT, page: 1 })
      if (cancelled) return
      onCountLoaded?.(first.count)
      const totalPages = Math.ceil(first.count / PAGE_LIMIT)
      if (totalPages <= 1) { setReleases(first.results); return }
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.small.release({ producer: producerId, sort: "released", reverse: true, limit: PAGE_LIMIT, page: i + 2 })
        )
      )
      if (cancelled) return
      setReleases([...first.results, ...rest.flatMap(r => r.results)])
    }

    fetchAll()
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [producerId])

  if (loading) return <Loading message="Loading releases..." />
  if (error)   return <ErrorStatus message={error} />
  if (releases.length === 0) return <p className="text-sm text-muted">No releases found.</p>

  const sharedRowProps = { producerId, showOriginal, RTYPE, LANG_ICON, PLAT_ICON }

  /* ── Group-by selector ── */
  const GroupSelector = (
    <div className="flex gap-1">
      {(["all", "language", "vn"] as GroupBy[]).map(mode => (
        <button
          key={mode}
          onClick={() => setGroupBy(mode)}
          className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
            groupBy === mode
              ? "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          {mode === "all" ? "All" : mode === "language" ? "Language" : "VN"}
        </button>
      ))}
    </div>
  )

  /* ── All: flat list ── */
  if (groupBy === "all") {
    return (
      <div className="flex flex-col gap-4">
        {GroupSelector}
        <div className="rounded-lg border border-white/5 overflow-hidden">
          {releases.map((r, i) => (
            <ReleaseRow key={r.id} release={r} index={i} {...sharedRowProps} />
          ))}
        </div>
      </div>
    )
  }

  /* ── Language: group by all langs (release can appear in multiple groups) ── */
  if (groupBy === "language") {
    const NO_LANG = "__none__"
    const groups = new Map<string, Release_Small[]>()
    for (const r of releases) {
      if (!r.languages || r.languages.length === 0) {
        const arr = groups.get(NO_LANG) ?? []; arr.push(r); groups.set(NO_LANG, arr)
      } else {
        for (const l of r.languages) {
          const arr = groups.get(l.lang) ?? []; arr.push(r); groups.set(l.lang, arr)
        }
      }
    }

    return (
      <div className="flex flex-col gap-4">
        {GroupSelector}
        <div className="flex flex-col gap-3">
          {[...groups.entries()].map(([lang, group]) => {
            const langLabel = lang === NO_LANG ? "Unknown" : (LANGUAGE[lang] ?? lang)
            const iconClass = lang !== NO_LANG ? (LANG_ICON[lang] ?? "") : ""
            return (
              <GroupSection
                key={lang} groupKey={lang}
                header={
                  <>
                    {iconClass && <span className={iconClass} />}
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider flex-1 text-left">
                      {langLabel}
                    </span>
                  </>
                }
                defaultCollapsed={lang !== producerLang}
                count={group.length}
                releases={group}
                {...sharedRowProps}
              />
            )
          })}
        </div>
      </div>
    )
  }

  /* ── VN: group by each vns[] entry (release can appear in multiple groups) ── */
  const NO_VN = "__none__"
  const vnGroups = new Map<string, { title: string; altTitle?: string; releases: Release_Small[] }>()

  for (const r of releases) {
    if (!r.vns || r.vns.length === 0) {
      const entry = vnGroups.get(NO_VN) ?? { title: "Unknown VN", releases: [] }
      entry.releases.push(r)
      vnGroups.set(NO_VN, entry)
    } else {
      for (const vn of r.vns) {
        const entry = vnGroups.get(vn.id) ?? {
          title: vn.title ?? vn.id,
          altTitle: vn.alttitle,
          releases: [],
        }
        entry.releases.push(r)
        vnGroups.set(vn.id, entry)
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {GroupSelector}
      <div className="flex flex-col gap-3">
        {[...vnGroups.entries()].map(([vnId, { title, altTitle, releases: group }]) => (
          <GroupSection
            key={vnId} groupKey={vnId}
            header={
              <div className="flex-1 min-w-0 text-left">
                {vnId === NO_VN ? (
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Unknown VN</span>
                ) : (
                  <Link
                    href={`/${vnId}`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs font-semibold text-white/90 hover:text-accent transition-colors inline-block"
                  >
                    {showOriginal && altTitle ? altTitle : title}
                  </Link>
                )}
              </div>
            }
            defaultCollapsed={true}
            count={group.length}
            releases={group}
            {...sharedRowProps}
          />
        ))}
      </div>
    </div>
  )
}
