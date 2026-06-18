/** Character detail sidebar: portrait, physical stats, voice actors,
 *  collection controls. The `inline` arrangement (stacked layout) puts the
 *  portrait beside the stats card from `sm` up. */
"use client"

import Link from "next/link"
import { cn, shouldBlur, formatBirthday } from "@/lib/utils"
import { useSearchContext } from "@/context/SearchContext"
import { displayName } from "@/lib/original"
import { CollectionControls } from "@/components/category/CollectionControls"
import { ICON } from "@/lib/icons"
import { enumLabel } from "@/lib/enums"
import { InfoCard, TitledCard, InfoRow, InlineList } from "@/components/detail/InfoPrimitives"
import { DetailCover } from "@/components/detail/DetailCover"
import type { Character } from "@/lib/types"

interface CharacterInfoPanelProps {
  character: Character
  sexualLevel: string
  violenceLevel: string
  spoilerLevel: 0 | 1 | 2
  /** Inline arrangement for the stacked layout (portrait left of the stats card from `sm` up). */
  inline?: boolean
}

export function CharacterInfoPanel({
  character, sexualLevel, violenceLevel, spoilerLevel, inline
}: CharacterInfoPanelProps) {
  const { showOriginal } = useSearchContext()

  const blur = character.image
    ? shouldBlur(character.image.sexual, character.image.violence, sexualLevel, violenceLevel)
    : false

  // Sex display
  const sexApparent = character.sex?.[0]
  const sexReal = character.sex?.[1]
  const hasSexSpoiler = !!(sexApparent && sexReal && sexReal !== sexApparent && sexReal !== "n")

  const birthday = formatBirthday(character.birthday)

  // Bust / waist / hips each get their own row; cup size rides along the bust row.
  const cup = character.cup ? `${character.cup.toUpperCase()} cup` : null

  // Whether the physical-info card has any row worth showing.
  const hasPhysical =
    !!sexApparent || !!birthday || character.age != null ||
    character.height != null || character.weight != null ||
    character.bust != null || character.waist != null || character.hips != null ||
    !!cup || !!character.blood_type || character.aliases.length > 0

  /* ─── Shared pieces — defined once so the column and inline arrangements show
   *     the same data; only the portrait placement differs. ──────────────── */

  const cover = (
    <DetailCover image={character.image} alt={character.name} blurred={blur} objectTop emptyLabel="No image" />
  )

  const physicalCard = hasPhysical && (
    <InfoCard>
      {sexApparent && (
        <InfoRow label="Sex">
          <span className="flex items-center gap-1.5">
            <span className={cn(
              (ICON.CHARACTER_SEX as Record<string, string>)[sexApparent],
              "charsex-" + sexApparent
            )} />
            <span>
              {enumLabel('CHARACTER_SEX', sexApparent)}
              {hasSexSpoiler && spoilerLevel < 2 && (
                <span className="text-yellow-500/70"> (?)</span>
              )}
              {hasSexSpoiler && spoilerLevel >= 2 && sexReal && (
                <span className="text-yellow-400"> → {enumLabel('CHARACTER_SEX', sexReal)}</span>
              )}
            </span>
          </span>
        </InfoRow>
      )}
      {birthday && (
        <InfoRow label="Birthday">{birthday}</InfoRow>
      )}
      {character.age != null && (
        <InfoRow label="Age">{character.age}</InfoRow>
      )}
      {character.height != null && (
        <InfoRow label="Height">{character.height} cm</InfoRow>
      )}
      {character.weight != null && (
        <InfoRow label="Weight">{character.weight} kg</InfoRow>
      )}
      {(character.bust != null || cup) && (
        <InfoRow label="Bust">
          {character.bust != null && `${character.bust} cm`}
          {cup && (
            <span className="text-muted">{character.bust != null ? `(${cup})` : cup}</span>
          )}
        </InfoRow>
      )}
      {character.waist != null && (
        <InfoRow label="Waist">{character.waist} cm</InfoRow>
      )}
      {character.hips != null && (
        <InfoRow label="Hips">{character.hips} cm</InfoRow>
      )}
      {character.blood_type && (
        <InfoRow label="Blood type">{character.blood_type.toUpperCase()}</InfoRow>
      )}
      {character.aliases.length > 0 && (
        <InfoRow label="Aliases">
          <InlineList className="text-white/70" items={character.aliases} />
        </InfoRow>
      )}
    </InfoCard>
  )

  const seiyuuCard = character.seiyuu.length > 0 && (
    <TitledCard title="Voiced by">
      <div className="flex flex-col gap-1">
        {character.seiyuu.map((s, idx) => (
          <div key={`${s.id}-${idx}`} className="flex items-baseline gap-1.5">
            <Link href={`/${s.id}`} className="text-xs text-white/90 hover:text-accent transition-colors">
              {displayName(s, showOriginal)}
            </Link>
            {s.note && (
              <span className="text-xs text-muted/60">({s.note})</span>
            )}
          </div>
        ))}
      </div>
    </TitledCard>
  )

  const collection = <CollectionControls type="character" id={character.id} inline={inline} />

  if (inline) {
    return (
      <div className="flex flex-col gap-3">
        {/* Phones (< sm): portrait full-width on top, stats card full-width below.
            From sm up: portrait left (fixed), stats right. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full shrink-0 sm:w-28">{cover}</div>
          {physicalCard && <div className="w-full min-w-0 sm:flex-1">{physicalCard}</div>}
        </div>
        {seiyuuCard}
        {collection}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {cover}
      {physicalCard}
      {seiyuuCard}
      {collection}
    </div>
  )
}
