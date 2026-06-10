/** VN detail page: info sidebar + description / tags / characters / staff / releases / screenshots. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { displayTitle } from "@/lib/original"
import type { VN } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { DetailLayout, DetailStatus } from "@/components/common/DetailLayout"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
import { Section } from "@/components/common/InfoPrimitives"
import { BBCodeText } from "@/components/common/BBCodeText"
import { VNInfoPanel } from "./VNInfoPanel"
import { VNTags } from "./VNTags"
import { VNScreenshots } from "./VNScreenshots"
import { VNStaff } from "./VNStaff"
import { VNCharacters } from "./VNCharacters"
import { VNCharactersPanel } from "./VNCharactersPanel"
import { VNReleases } from "./VNReleases"

interface VNDetailPageProps {
  id: number
}

export function VNDetailPage({ id }: VNDetailPageProps) {
  const { data: vn, loading, error } = useEntity<VN>(id, api.by_id.vn)
  const { showOriginal } = useSearchContext()
  const { defaultSexualLevel, defaultViolenceLevel, vnCharacterLayout } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)
  const [charsExpanded, setCharsExpanded] = useState(false)
  // When the expanded view is opened from a specific slide card, scroll that
  // character's card into view; null = opened from the heading (start at top).
  const [charsFocusId, setCharsFocusId] = useState<string | null>(null)

  const openExpanded = (focusId: string | null) => {
    setCharsFocusId(focusId)
    setCharsExpanded(true)
  }

  if (loading || error || !vn) return <DetailStatus loading={loading} error={error} />

  const levelSelectors = (direction: "row" | "col") => (
    <ContentLevelSelectors
      direction={direction}
      sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
      violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
    />
  )

  return (
    <DetailLayout
      asideWidth="lg"
      aside={<>{levelSelectors("col")}<VNInfoPanel vn={vn} sexualLevel={sexualLevel} violenceLevel={violenceLevel} /></>}
      mobileAside={<>{levelSelectors("row")}<VNInfoPanel vn={vn} sexualLevel={sexualLevel} violenceLevel={violenceLevel} mobile /></>}
    >
      {charsExpanded ? (
        <VNCharactersPanel
          vnId={vn.id}
          characters={vn.characters}
          sexualLevel={sexualLevel}
          violenceLevel={violenceLevel}
          focusId={charsFocusId}
          onClose={() => setCharsExpanded(false)}
        />
      ) : (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            {displayTitle(vn, showOriginal)}
          </h1>
        </div>

        {vn.description && (
          <Section title="Description">
            <BBCodeText text={vn.description} collapsible />
          </Section>
        )}

        {vn.tags.length > 0 && (
          <Section title="Tags" count={vn.tags.length}>
            <VNTags tags={vn.tags} sexualLevel={sexualLevel} />
          </Section>
        )}

        {vn.characters.length > 0 && (
          <Section
            title="Characters"
            count={vn.characters.length}
            onTitleClick={() => openExpanded(null)}
          >
            <VNCharacters
              vnId={vn.id}
              characters={vn.characters}
              va={vn.va}
              sexualLevel={sexualLevel}
              violenceLevel={violenceLevel}
              layout={vnCharacterLayout}
              onExpand={openExpanded}
            />
          </Section>
        )}

        {vn.staff.length > 0 && (
          <Section title="Staff" count={vn.staff.length}>
            <VNStaff staff={vn.staff} editions={vn.editions} />
          </Section>
        )}

        {vn.releases && vn.releases.length > 0 && (
          <Section title="Releases" count={vn.releases.length}>
            <VNReleases releases={vn.releases} olang={vn.olang} />
          </Section>
        )}

        {vn.screenshots.length > 0 && (
          <Section title="Screenshots" count={vn.screenshots.length}>
            <VNScreenshots
              screenshots={vn.screenshots}
              sexualLevel={sexualLevel}
              violenceLevel={violenceLevel}
            />
          </Section>
        )}
      </div>
      )}
    </DetailLayout>
  )
}
