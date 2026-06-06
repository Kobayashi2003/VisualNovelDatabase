/** Tag detail page: info sidebar + description + paginated tagged VNs. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { enumLabel } from "@/lib/enums"
import type { Tag } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useUserContext } from "@/context/UserContext"
import { useSearchContext } from "@/context/SearchContext"
import { useDictionary } from "@/hooks/useDictionary"
import { usePassage } from "@/hooks/usePassage"
import { DetailLayout, DetailStatus } from "@/components/common/DetailLayout"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
import { Section } from "@/components/common/InfoPrimitives"
import { BBCodeText } from "@/components/common/BBCodeText"
import { EntityCardSection } from "@/components/common/EntityCardSection"
import { VNsCardsGrid } from "@/components/card/CardsGrid"
import { TagInfoPanel } from "./TagInfoPanel"

interface TagDetailPageProps {
  id: number
}

export function TagDetailPage({ id }: TagDetailPageProps) {
  const { data: tag, loading, error } = useEntity<Tag>(id, api.by_id.tag)
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)

  // Original-text mode: localise the name (transserve dictionary) and the
  // description (transserve passage memory) to Japanese, each falling back to
  // the original English while loading or when no translation exists.
  const { showOriginal } = useSearchContext()
  const translateName = useDictionary(tag ? [tag.name] : [], showOriginal)
  const description = usePassage(tag?.description, showOriginal)

  if (loading || error || !tag) return <DetailStatus loading={loading} error={error} />

  return (
    <DetailLayout
      aside={
        <>
          <ContentLevelSelectors
            sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
            violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
          />
          <TagInfoPanel tag={tag} />
        </>
      }
      mobileAside={
        <>
          <ContentLevelSelectors
            direction="row"
            sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
            violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
          />
          <TagInfoPanel tag={tag} />
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{translateName(tag.name)}</h1>
          {tag.category && (
            <p className="text-sm text-muted mt-0.5">{enumLabel('CATEGORY', tag.category)}</p>
          )}
        </div>

        {description && (
          <Section title="Description">
            <BBCodeText text={description} collapsible />
          </Section>
        )}

        <Section title={`Visual Novels (${tag.vn_count.toLocaleString()})`}>
          <EntityCardSection
            query={{ tag: tag.id, sort: "rating", reverse: true }}
            fetcher={api.small.vn}
            renderGrid={vns => (
              <VNsCardsGrid
                vns={vns} layout="grid" cardType="image"
                sexualLevel={sexualLevel} violenceLevel={violenceLevel}
              />
            )}
            loadingMessage="Loading visual novels..."
            emptyMessage="No visual novels listed."
          />
        </Section>
      </div>
    </DetailLayout>
  )
}
