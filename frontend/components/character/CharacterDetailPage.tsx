/** Character detail page (media kind): info sidebar with portrait +
 *  description / traits / VNs sections. */
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { displayName } from "@/lib/original"
import type { Character } from "@/lib/types"
import { useEntity } from "@/hooks/useEntity"
import { useSpoilerLevel } from "@/hooks/useSpoilerLevel"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { DetailShell, DetailStatus } from "@/components/detail/DetailShell"
import { DetailHeader } from "@/components/detail/DetailHeader"
import { Section } from "@/components/detail/InfoPrimitives"
import { ContentLevelSelectors } from "@/components/common/ContentLevelSelectors"
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

  /* ── Render ────────────────────────────────────────────────────────────── */

  const levelSelectors = (direction: "row" | "col") => (
    <ContentLevelSelectors
      direction={direction}
      sexualLevel={sexualLevel} setSexualLevel={setSexualLevel}
      violenceLevel={violenceLevel} setViolenceLevel={setViolenceLevel}
    />
  )

  const infoPanel = (inline?: boolean) => (
    <CharacterInfoPanel
      character={character}
      sexualLevel={sexualLevel}
      violenceLevel={violenceLevel}
      spoilerLevel={spoiler.spoilerLevel}
      inline={inline}
    />
  )

  return (
    <DetailShell
      asideWidth="lg"
      header={
        <DetailHeader
          title={displayName(character, showOriginal)}
          action={spoiler.hasAnySpoilers && (
            <button
              onClick={spoiler.cycle}
              className={cn("text-xs transition-colors shrink-0 pt-1", spoiler.buttonColor)}
            >
              {spoiler.buttonLabel}
            </button>
          )}
        />
      }
      aside={<>{levelSelectors("col")}{infoPanel()}</>}
      inlineAside={<>{levelSelectors("row")}{infoPanel(true)}</>}
    >
      <div className="flex flex-col gap-6">
        {character.description && (
          <Section title="Description">
            <BBCodeText text={character.description} collapsible />
          </Section>
        )}

        {character.traits.length > 0 && (
          <Section title="Traits" count={character.traits.length}>
            <CharacterTraits
              traits={character.traits}
              spoilerLevel={spoiler.spoilerLevel}
              sexualLevel={sexualLevel}
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
    </DetailShell>
  )
}
