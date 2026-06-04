/** Character detail sidebar: cover, physical stats, voice actors, collection button. */
"use client"

import { useState } from "react"
import Link from "next/link"
import { cn, shouldBlur } from "@/lib/utils"
import { useSearchContext } from "@/context/SearchContext"
import { displayName } from "@/lib/original"
import { CollectionButton } from "@/components/category/CollectionButton"
import { CollectionRating } from "@/components/category/CollectionRating"
import { ICON } from "@/lib/icons"
import { enumLabel } from "@/lib/enums"
import { InfoRow, InlineList } from "@/components/common/InfoPrimitives"
import { Lightbox } from "@/components/common/Lightbox"
import { ImageWithFallback } from "@/components/common/ImageWithFallback"
import type { Character } from "@/lib/types"

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface CharacterInfoPanelProps {
  character: Character
  sexualLevel: string
  violenceLevel: string
  spoilerLevel: 0 | 1 | 2
  mobile?: boolean
}

export function CharacterInfoPanel({
  character, sexualLevel, violenceLevel, spoilerLevel, mobile
}: CharacterInfoPanelProps) {
  const [coverOpen, setCoverOpen] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const { showOriginal } = useSearchContext()

  const blur = character.image
    ? shouldBlur(character.image.sexual, character.image.violence, sexualLevel, violenceLevel)
    : false

  // Sex display
  const sexApparent = character.sex?.[0]
  const sexReal = character.sex?.[1]
  const hasSexSpoiler = !!(sexApparent && sexReal && sexReal !== sexApparent && sexReal !== "n")

  // Birthday
  const birthday = character.birthday
    ? `${character.birthday[1]} ${MONTH_NAMES[character.birthday[0]] ?? character.birthday[0]}`
    : null

  // Bust / waist / hips each get their own row; cup size rides along the bust row.
  const cup = character.cup ? `${character.cup.toUpperCase()} cup` : null

  // Whether the physical-info card has any row worth showing.
  const hasPhysical =
    !!sexApparent || !!birthday || character.age != null ||
    character.height != null || character.weight != null ||
    character.bust != null || character.waist != null || character.hips != null ||
    !!cup || !!character.blood_type || character.aliases.length > 0

  /* ─── Shared pieces — defined once so the desktop and mobile layouts show the
   *     same data; only the cover arrangement differs. ───────────────────── */

  const lightbox = coverOpen && character.image && (
    <Lightbox
      images={[{ url: character.image.url, blurred: blur }]}
      index={0}
      onClose={() => setCoverOpen(false)}
      onIndexChange={() => {}}
    />
  )

  const physicalCard = hasPhysical && (
    <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
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
    </div>
  )

  const seiyuuCard = character.seiyuu.length > 0 && (
    <div className="rounded-lg bg-surface border border-white/5 px-3 py-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Voiced by</p>
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
    </div>
  )

  const collection = (
    <>
      <CollectionButton type="character" id={character.id} />
      <CollectionRating type="character" id={character.id} />
    </>
  )

  if (mobile) {
    return (
      <div className="flex flex-col gap-3">
        {/* Phones (< sm): cover centred on top, info card full-width below.
            From sm up: cover left, info right. */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="w-36 shrink-0 sm:w-28">
            <div
              className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated cursor-pointer"
              onClick={() => character.image && setCoverOpen(true)}
            >
              {character.image ? (
                <ImageWithFallback
                  src={character.image.url}
                  alt={character.name}
                  fill
                  className={cn("object-cover object-top", blur && "blur-xl scale-105")}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">No image</div>
              )}
            </div>
          </div>
          {physicalCard && <div className="w-full min-w-0 sm:flex-1">{physicalCard}</div>}
        </div>
        {lightbox}
        {seiyuuCard}
        {collection}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated cursor-pointer group"
        onClick={() => character.image && setCoverOpen(true)}
      >
        {character.image ? (
          <>
            <ImageWithFallback
              src={character.image.url}
              alt={character.name}
              fill
              className={cn(
                "object-cover object-top transition-all duration-300",
                !imgLoaded && "opacity-0",
                blur && "blur-xl scale-105"
              )}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">No image</div>
        )}
      </div>

      {lightbox}
      {physicalCard}
      {seiyuuCard}
      {collection}
    </div>
  )
}
