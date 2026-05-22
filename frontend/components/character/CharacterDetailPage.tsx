/** Character detail page: info panel sidebar + description / traits / VNs sections. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { displayName } from "@/lib/original"
import type { Character } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useSpoilerLevel } from "@/hooks/useSpoilerLevel"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { DetailLayout, DetailStatus } from "@/components/common/DetailLayout"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
import { Section } from "@/components/common/InfoPrimitives"
import { BBCodeText } from "@/components/common/BBCodeText"
import { CharacterInfoPanel } from "./CharacterInfoPanel"
import { CharacterTraits } from "./CharacterTraits"
import { CharacterVNs } from "./CharacterVNs"

interface CharacterDetailPageProps {
  id: number
}

export function CharacterDetailPage({ id }: CharacterDetailPageProps) {
  const { data: character, loading, error } = useEntity<Character>(id, api.by_id.character)
  const { showOriginal } = useSearchContext()
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)

  const traits = character?.traits ?? []
  const spoiler = useSpoilerLevel(
    traits.some(t => t.spoiler === 1),
    traits.some(t => t.spoiler === 2),
  )

  if (loading || error || !character) return <DetailStatus loading={loading} error={error} />

  const levelSelectors = (direction: "row" | "col") => (
    <ContentLevelSelectors
      direction={direction}
      sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
      violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
    />
  )

  const infoPanel = (mobile?: boolean) => (
    <CharacterInfoPanel
      character={character}
      sexualLevel={sexualLevel}
      violenceLevel={violenceLevel}
      spoilerLevel={spoiler.spoilerLevel}
      mobile={mobile}
    />
  )

  return (
    <DetailLayout
      asideWidth="lg"
      aside={<>{levelSelectors("col")}{infoPanel()}</>}
      mobileAside={<>{levelSelectors("row")}{infoPanel(true)}</>}
    >
      <div className="flex flex-col gap-6">
        {/* Title + spoiler toggle */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {displayName(character, showOriginal)}
            </h1>
          </div>
          {spoiler.hasAnySpoilers && (
            <button
              onClick={spoiler.cycle}
              className="text-xs text-muted hover:text-white transition-colors shrink-0 pt-1"
            >
              {spoiler.buttonLabel}
            </button>
          )}
        </div>

        {character.description && (
          <Section title="Description">
            <BBCodeText text={character.description} />
          </Section>
        )}

        {character.traits.length > 0 && (
          <Section title="Traits" count={character.traits.length}>
            <CharacterTraits
              traits={character.traits}
              spoilerLevel={spoiler.spoilerLevel}
              sexualLevel={sexualLevel}
              sex={character.sex?.[0]}
              onRevealMinor={() => spoiler.setSpoilerLevel(1)}
              onRevealMajor={() => spoiler.setSpoilerLevel(2)}
            />
          </Section>
        )}

        {character.vns.length > 0 && (
          <Section title="Visual Novels" count={character.vns.length}>
            <CharacterVNs vns={character.vns} />
          </Section>
        )}
      </div>
    </DetailLayout>
  )
}
