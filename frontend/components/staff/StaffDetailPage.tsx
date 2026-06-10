/** Staff detail page (catalog kind): info sidebar + description + tabbed
 *  credits / voiced-characters grids. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { displayName } from "@/lib/original"
import type { Staff } from "@/lib/types"
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

  const { tabs, active, setActive } = useDetailTabs<StaffTab>(staff?.id, [
    { value: "credits", label: "VN Credits", fetchCount: () => api.small.vn({ staff: staff!.id, limit: 1 }) },
    { value: "characters", label: "Voiced Characters", fetchCount: () => api.small.character({ seiyuu: staff!.id, limit: 1 }) },
  ])

  if (loading || error || !staff) return <DetailStatus loading={loading} error={error} />

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
      header={
        <DetailHeader
          title={displayName(staff, showOriginal)}
          subtitle={!staff.ismain && (
            <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
              Alias entry
            </span>
          )}
        />
      }
      aside={<>{levelSelectors("col")}<StaffInfoPanel staff={staff} /></>}
      inlineAside={<>{levelSelectors("row")}<StaffInfoPanel staff={staff} inline /></>}
    >
      <div className="flex flex-col gap-6">
        {staff.description && (
          <Section title="Description">
            <BBCodeText text={staff.description} collapsible />
          </Section>
        )}

        <div>
          {tabs.length > 0 && (
            <div className="mb-3">
              <TabBar
                tabs={tabs}
                active={active ?? ""}
                onChange={v => setActive(v as StaffTab)}
              />
            </div>
          )}
          {active === "credits" ? (
            <EntityCardSection
              query={{ staff: staff.id, sort: "released", reverse: true }}
              fetcher={api.small.vn}
              renderGrid={vns => (
                <VNsCardsGrid vns={vns} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
              )}
              loadingMessage="Loading visual novels..."
              emptyMessage="No visual novels found."
            />
          ) : active === "characters" ? (
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
    </DetailShell>
  )
}
