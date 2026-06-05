/** Staff detail page: info sidebar + description + paginated credits / voiced characters. */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { displayName } from "@/lib/original"
import type { Staff } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { DetailLayout, DetailStatus } from "@/components/common/DetailLayout"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
import { Section } from "@/components/common/InfoPrimitives"
import { BBCodeText } from "@/components/common/BBCodeText"
import { EntityCardSection } from "@/components/common/EntityCardSection"
import { TabBar } from "@/components/common/TabBar"
import { VNsCardsGrid, CharactersCardsGrid } from "@/components/card/CardsGrid"
import { StaffInfoPanel } from "./StaffInfoPanel"

interface StaffDetailPageProps {
  id: number
}

type StaffTab = "credits" | "characters"

export function StaffDetailPage({ id }: StaffDetailPageProps) {
  const { data: staff, loading, error } = useEntity<Staff>(id, api.by_id.staff)
  const { showOriginal } = useSearchContext()
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)
  const [activeTab, setActiveTab] = useState<StaffTab>("credits")
  // null = count not loaded yet; a number once the eager count query resolves.
  const [vnCreditsCount, setVnCreditsCount] = useState<number | null>(null)
  const [voicedCount, setVoicedCount] = useState<number | null>(null)

  // Eagerly fetch every tab's count together, so the tab bar is consistent
  // and empty tabs can be hidden.
  useEffect(() => {
    if (!staff) return
    let cancelled = false
    setVnCreditsCount(null)
    setVoicedCount(null)
    Promise.all([
      api.small.vn({ staff: staff.id, limit: 1 }),
      api.small.character({ seiyuu: staff.id, limit: 1 }),
    ])
      .then(([vnRes, charRes]) => {
        if (cancelled) return
        setVnCreditsCount(vnRes.count)
        setVoicedCount(charRes.count)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [staff])

  if (loading || error || !staff) return <DetailStatus loading={loading} error={error} />

  /* ── Render ────────────────────────────────────────────────────────────── */

  // Tab bar: a tab with a known count of 0 is hidden; a tab still loading
  // (count null) stays visible without a badge.
  const tabDefs: { value: StaffTab; label: string; count: number | null }[] = [
    { value: "credits", label: "VN Credits", count: vnCreditsCount },
    { value: "characters", label: "Voiced Characters", count: voicedCount },
  ]
  const visibleTabs = tabDefs.filter(t => t.count == null || t.count > 0)
  const effectiveTab = visibleTabs.some(t => t.value === activeTab)
    ? activeTab
    : visibleTabs[0]?.value

  const levelSelectors = (direction: "row" | "col") => (
    <ContentLevelSelectors
      direction={direction}
      sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
      violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
    />
  )

  return (
    <DetailLayout
      aside={<>{levelSelectors("col")}<StaffInfoPanel staff={staff} /></>}
      mobileAside={<>{levelSelectors("row")}<StaffInfoPanel staff={staff} /></>}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            {displayName(staff, showOriginal)}
          </h1>
          {!staff.ismain && (
            <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
              Alias entry
            </span>
          )}
        </div>

        {staff.description && (
          <Section title="Description">
            <BBCodeText text={staff.description} collapsible />
          </Section>
        )}

        <div>
          {visibleTabs.length > 0 && (
            <div className="mb-3">
              <TabBar
                tabs={visibleTabs.map(t => ({ value: t.value, label: t.label, count: t.count ?? undefined }))}
                active={effectiveTab ?? ""}
                onChange={v => setActiveTab(v as StaffTab)}
              />
            </div>
          )}
          {effectiveTab === "credits" ? (
            <EntityCardSection
              query={{ staff: staff.id, sort: "released", reverse: true }}
              fetcher={api.small.vn}
              renderGrid={vns => (
                <VNsCardsGrid vns={vns} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
              )}
              loadingMessage="Loading visual novels..."
              emptyMessage="No visual novels found."
            />
          ) : effectiveTab === "characters" ? (
            <EntityCardSection
              query={{ seiyuu: staff.id, sort: "name" }}
              fetcher={api.small.character}
              renderGrid={characters => (
                <CharactersCardsGrid
                  characters={characters}
                  sexualLevel={sexualLevel} violenceLevel={violenceLevel}
                />
              )}
              loadingMessage="Loading characters..."
              emptyMessage="No voiced characters found."
            />
          ) : (
            <p className="text-sm text-muted">No credits or voiced characters found.</p>
          )}
        </div>
      </div>
    </DetailLayout>
  )
}
