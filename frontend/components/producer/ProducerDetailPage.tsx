/** Producer detail page: info sidebar + description + paginated VN / release catalog. */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { displayName } from "@/lib/original"
import type { Producer } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { DetailLayout, DetailStatus } from "@/components/common/DetailLayout"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
import { Section } from "@/components/common/InfoPrimitives"
import { BBCodeText } from "@/components/common/BBCodeText"
import { EntityCardSection } from "@/components/common/EntityCardSection"
import { TabBar } from "@/components/common/TabBar"
import { VNsCardsGrid } from "@/components/card/CardsGrid"
import { ProducerInfoPanel } from "./ProducerInfoPanel"
import { ProducerReleases } from "./ProducerReleases"

interface ProducerDetailPageProps {
  id: number
}

type ProducerTab = "vns" | "releases"

export function ProducerDetailPage({ id }: ProducerDetailPageProps) {
  const { data: producer, loading, error } = useEntity<Producer>(id, api.by_id.producer)
  const { showOriginal } = useSearchContext()
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)
  const [activeTab, setActiveTab] = useState<ProducerTab>("vns")
  // null = count not loaded yet; a number once the eager count query resolves.
  const [vnCount, setVnCount] = useState<number | null>(null)
  const [releaseCount, setReleaseCount] = useState<number | null>(null)

  // Eagerly fetch every tab's count together, so the tab bar is consistent
  // and empty tabs can be hidden.
  useEffect(() => {
    if (!producer) return
    let cancelled = false
    setVnCount(null)
    setReleaseCount(null)
    Promise.all([
      api.small.vn({ developer: producer.id, limit: 1 }),
      api.small.release({ producer: producer.id, limit: 1 }),
    ])
      .then(([vnRes, relRes]) => {
        if (cancelled) return
        setVnCount(vnRes.count)
        setReleaseCount(relRes.count)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [producer])

  if (loading || error || !producer) return <DetailStatus loading={loading} error={error} />

  /* ── Render ────────────────────────────────────────────────────────────── */

  // Tab bar: a tab with a known count of 0 is hidden; a tab still loading
  // (count null) stays visible without a badge.
  const tabDefs: { value: ProducerTab; label: string; count: number | null }[] = [
    { value: "vns", label: "Visual Novels", count: vnCount },
    { value: "releases", label: "Releases", count: releaseCount },
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
      aside={<>{levelSelectors("col")}<ProducerInfoPanel producer={producer} /></>}
      mobileAside={<>{levelSelectors("row")}<ProducerInfoPanel producer={producer} /></>}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            {displayName(producer, showOriginal)}
          </h1>
        </div>

        {producer.description && (
          <Section title="Description">
            <BBCodeText text={producer.description} collapsible />
          </Section>
        )}

        <div>
          {visibleTabs.length > 0 && (
            <div className="mb-3">
              <TabBar
                tabs={visibleTabs.map(t => ({ value: t.value, label: t.label, count: t.count ?? undefined }))}
                active={effectiveTab ?? ""}
                onChange={v => setActiveTab(v as ProducerTab)}
              />
            </div>
          )}
          {effectiveTab === "vns" ? (
            <EntityCardSection
              query={{ developer: producer.id, sort: "released", reverse: true }}
              fetcher={api.small.vn}
              renderGrid={vns => (
                <VNsCardsGrid vns={vns} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
              )}
              loadingMessage="Loading visual novels..."
              emptyMessage="No visual novels found."
            />
          ) : effectiveTab === "releases" ? (
            <ProducerReleases producerId={producer.id} producerLang={producer.lang} />
          ) : (
            <p className="text-sm text-muted">No visual novels or releases found.</p>
          )}
        </div>
      </div>
    </DetailLayout>
  )
}
