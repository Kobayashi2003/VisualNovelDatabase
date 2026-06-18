/** Release detail page: info sidebar (metadata + linked VNs + producers) with
 *  notes and the image gallery as the body. Releases often have neither notes
 *  nor images, in which case the shell stacks the page at every width. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { ICON } from "@/lib/icons"
import { displayTitle } from "@/lib/original"
import type { Release } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { DetailShell, DetailStatus } from "@/components/detail/DetailShell"
import { DetailHeader } from "@/components/detail/DetailHeader"
import { Section } from "@/components/detail/InfoPrimitives"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
import { BBCodeText } from "@/components/common/BBCodeText"
import { ReleaseInfoPanel } from "./ReleaseInfoPanel"
import { ReleaseImageGallery } from "./ReleaseImageGallery"

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

  const hasBody = !!release.notes || release.images.length > 0

  return (
    <DetailShell
      header={
        <DetailHeader
          icon={mainLang && LANG_ICON[mainLang.lang] && <span className={LANG_ICON[mainLang.lang]} />}
          title={displayTitle(release, showOriginal)}
        />
      }
      aside={<>{levelSelectors("col")}<ReleaseInfoPanel release={release} /></>}
      inlineAside={<>{levelSelectors("row")}<ReleaseInfoPanel release={release} /></>}
      hasBody={hasBody}
    >
      {hasBody && (
        <div className="flex flex-col gap-6">
          {release.notes && (
            <Section title="Notes">
              <BBCodeText text={release.notes} />
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
      )}
    </DetailShell>
  )
}
