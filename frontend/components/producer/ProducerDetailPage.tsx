/** Producer detail page (catalog kind): info sidebar + description + tabbed
 *  VN / release grids. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { displayName } from "@/lib/original"
import type { Producer } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useDetailTabs } from "@/hooks/useDetailTabs"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { DetailShell, DetailStatus } from "@/components/detail/DetailShell"
import { DetailHeader } from "@/components/detail/DetailHeader"
import { Section } from "@/components/detail/InfoPrimitives"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
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

  const { tabs, active, setActive } = useDetailTabs<ProducerTab>(producer?.id, [
    { value: "vns", label: "Visual Novels", fetchCount: () => api.small.vn({ developer: producer!.id, limit: 1 }) },
    { value: "releases", label: "Releases", fetchCount: () => api.small.release({ producer: producer!.id, limit: 1 }) },
  ])

  if (loading || error || !producer) return <DetailStatus loading={loading} error={error} />

  /* ── Render ────────────────────────────────────────────────────────────── */

  const levelSelectors = (direction: "row" | "col") => (
    <ContentLevelSelectors
      direction={direction}
      sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
      violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
    />
  )

  return (
    <DetailShell
      header={<DetailHeader title={displayName(producer, showOriginal)} />}
      aside={<>{levelSelectors("col")}<ProducerInfoPanel producer={producer} /></>}
      inlineAside={<>{levelSelectors("row")}<ProducerInfoPanel producer={producer} inline /></>}
    >
      <div className="flex flex-col gap-6">
        {producer.description && (
          <Section title="Description">
            <BBCodeText text={producer.description} collapsible />
          </Section>
        )}

        <div>
          {tabs.length > 0 && (
            <div className="mb-3">
              <TabBar
                tabs={tabs}
                active={active ?? ""}
                onChange={v => setActive(v as ProducerTab)}
              />
            </div>
          )}
          {active === "vns" ? (
            <EntityCardSection
              query={{ developer: producer.id, sort: "released", reverse: true }}
              fetcher={api.small.vn}
              renderGrid={vns => (
                <VNsCardsGrid vns={vns} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
              )}
              loadingMessage="Loading visual novels..."
              emptyMessage="No visual novels found."
            />
          ) : active === "releases" ? (
            <ProducerReleases producerId={producer.id} producerLang={producer.lang} />
          ) : (
            <p className="text-sm text-muted">No visual novels or releases found.</p>
          )}
        </div>
      </div>
    </DetailShell>
  )
}
