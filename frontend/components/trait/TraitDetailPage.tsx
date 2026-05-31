/** Trait detail page: info sidebar + description + paginated characters with the trait. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import type { Trait } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useUserContext } from "@/context/UserContext"
import { DetailLayout, DetailStatus } from "@/components/common/DetailLayout"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
import { Section } from "@/components/common/InfoPrimitives"
import { BBCodeText } from "@/components/common/BBCodeText"
import { EntityCardSection } from "@/components/common/EntityCardSection"
import { CharactersCardsGrid } from "@/components/card/CardsGrid"
import { TraitInfoPanel } from "./TraitInfoPanel"

interface TraitDetailPageProps {
  id: number
}

export function TraitDetailPage({ id }: TraitDetailPageProps) {
  const { data: trait, loading, error } = useEntity<Trait>(id, api.by_id.trait)
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)

  if (loading || error || !trait) return <DetailStatus loading={loading} error={error} />

  return (
    <DetailLayout
      aside={
        <>
          <ContentLevelSelectors
            sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
            violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
          />
          <TraitInfoPanel trait={trait} />
        </>
      }
      mobileAside={
        <>
          <ContentLevelSelectors
            direction="row"
            sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
            violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
          />
          <TraitInfoPanel trait={trait} />
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{trait.name}</h1>
          {trait.group_name && (
            <p className="text-sm text-muted mt-0.5">{trait.group_name}</p>
          )}
        </div>

        {trait.description && (
          <Section title="Description">
            <BBCodeText text={trait.description} />
          </Section>
        )}

        <Section title={`Characters (${trait.char_count.toLocaleString()})`}>
          <EntityCardSection
            query={{ trait: trait.id }}
            fetcher={api.small.character}
            renderGrid={characters => (
              <CharactersCardsGrid
                characters={characters} layout="grid" cardType="image"
                sexualLevel={sexualLevel} violenceLevel={violenceLevel}
              />
            )}
            loadingMessage="Loading characters..."
            emptyMessage="No characters listed."
          />
        </Section>
      </div>
    </DetailLayout>
  )
}
