/** Release detail page: info sidebar + linked VNs + producers + image gallery. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { ICON } from "@/lib/icons"
import { displayTitle } from "@/lib/original"
import type { Release } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { DetailLayout, DetailStatus } from "@/components/common/DetailLayout"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
import { Section } from "@/components/common/InfoPrimitives"
import { ReleaseInfoPanel } from "./ReleaseInfoPanel"
import { ReleaseImageGallery } from "./ReleaseImageGallery"
import { ReleaseLinkedVNs } from "./ReleaseLinkedVNs"
import { ReleaseProducers } from "./ReleaseProducers"

interface ReleaseDetailPageProps {
  id: number
}

export function ReleaseDetailPage({ id }: ReleaseDetailPageProps) {
  const { data: release, loading, error } = useEntity<Release>(id, api.by_id.release)
  const { showOriginal } = useSearchContext()
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)

  if (loading || error || !release) return <DetailStatus loading={loading} error={error} />

  const LANG_ICON = ICON.LANGUAGE as Record<string, string>
  const mainLang = release.languages.find(l => l.main)

  const levelSelectors = (direction: "row" | "col") => (
    <ContentLevelSelectors
      direction={direction}
      sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
      violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
    />
  )

  return (
    <DetailLayout
      aside={<>{levelSelectors("col")}<ReleaseInfoPanel release={release} /></>}
      mobileAside={<>{levelSelectors("row")}<ReleaseInfoPanel release={release} /></>}
    >
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {mainLang && LANG_ICON[mainLang.lang] && (
              <span className={LANG_ICON[mainLang.lang]} />
            )}
            <h1 className="text-2xl font-bold text-white leading-tight">
              {displayTitle(release, showOriginal)}
            </h1>
          </div>
        </div>

        {release.notes && (
          <Section title="Notes">
            <p className="text-sm text-white/80 whitespace-pre-wrap">{release.notes}</p>
          </Section>
        )}

        {release.vns.length > 0 && (
          <Section title={`Visual Novels (${release.vns.length})`}>
            <ReleaseLinkedVNs vns={release.vns} />
          </Section>
        )}

        {release.producers && release.producers.length > 0 && (
          <Section title="Producers" count={release.producers.length}>
            <ReleaseProducers producers={release.producers} />
          </Section>
        )}

        {release.images.length > 0 && (
          <Section title={`Images (${release.images.length})`}>
            <ReleaseImageGallery
              images={release.images}
              sexualLevel={sexualLevel}
              violenceLevel={violenceLevel}
            />
          </Section>
        )}
      </div>
    </DetailLayout>
  )
}
