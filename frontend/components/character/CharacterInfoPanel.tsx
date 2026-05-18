"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CollectionButton } from "@/components/category/CollectionButton"
import { ICON } from "@/lib/icons"
import { shouldBlur } from "@/lib/blur"
import { InfoRow } from "@/components/common/InfoPanel"
import type { Character } from "@/lib/types"

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const SEX_LABEL: Record<string, string> = {
  m: "Male", f: "Female", b: "Both", n: "Unknown",
}

// ─── Main panel ───────────────────────────────────────────────────────────────
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
  const [coverMounted, setCoverMounted] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => { setCoverMounted(true) }, [])

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

  // Measurements string
  const hasMeasurements = character.bust || character.waist || character.hips
  const measurements = hasMeasurements
    ? [
        character.bust ? `${character.bust}` : "?",
        character.waist ? `${character.waist}` : "?",
        character.hips ? `${character.hips}` : "?",
      ].join("-") + (character.cup ? `, ${character.cup} cup` : "")
    : null

  const infoContent = (
    <div className="flex flex-col gap-0">
      {/* Cover */}
      <div
        className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated mb-4 cursor-pointer group"
        onClick={() => character.image && setCoverOpen(true)}
      >
        {character.image ? (
          <>
            <Image
              src={character.image.url}
              alt={character.name}
              fill
              className={cn(
                "object-cover object-top transition-all duration-300",
                !imgLoaded && "opacity-0",
                blur && "blur-xl scale-105"
              )}
              onLoad={() => setImgLoaded(true)}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs bg-black/50 px-2 py-1 rounded">
                Click to enlarge
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">No image</div>
        )}
      </div>

      {/* Lightbox */}
      {coverMounted && coverOpen && character.image && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setCoverOpen(false)}
        >
          <button
            onClick={() => setCoverOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={character.image.url}
            alt={character.name}
            className={cn(
              "max-w-[90vw] max-h-[90vh] object-contain rounded-lg",
              blur && "blur-xl"
            )}
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* Physical info */}
      <div className="rounded-lg bg-surface border border-white/5 px-3 py-1 mb-3">
        {sexApparent && (
          <InfoRow label="Sex">
            <span className="flex items-center gap-1.5">
              <span className={cn(
                (ICON.CHARACTER_SEX as Record<string, string>)[sexApparent],
                "charsex-" + sexApparent
              )} />
              <span>
                {SEX_LABEL[sexApparent] ?? sexApparent}
                {hasSexSpoiler && spoilerLevel < 2 && (
                  <span className="text-yellow-500/70"> (?)</span>
                )}
                {hasSexSpoiler && spoilerLevel >= 2 && sexReal && (
                  <span className="text-yellow-400"> → {SEX_LABEL[sexReal] ?? sexReal}</span>
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
        {measurements && (
          <InfoRow label="Measurements">
            <span>B-W-H: {measurements}</span>
          </InfoRow>
        )}
        {character.blood_type && (
          <InfoRow label="Blood type">{character.blood_type.toUpperCase()}</InfoRow>
        )}
        {character.aliases.length > 0 && (
          <InfoRow label="Aliases">
            <span className="text-white/70">{character.aliases.join(", ")}</span>
          </InfoRow>
        )}
      </div>

      {/* Voiced by */}
      {character.seiyuu.length > 0 && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-2 mb-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Voiced by</p>
          <div className="flex flex-col gap-1">
            {character.seiyuu.map((s, idx) => (
              <div key={`${s.id}-${idx}`} className="flex items-baseline gap-1.5">
                <Link href={`/${s.id}`} className="text-xs text-white/90 hover:text-accent transition-colors">
                  {s.name}
                </Link>
                {s.original && (
                  <span className="text-xs text-muted">{s.original}</span>
                )}
                {s.note && (
                  <span className="text-xs text-muted/60">({s.note})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <CollectionButton type="character" id={character.id} />
    </div>
  )

  if (mobile) {
    return (
      <div className="flex gap-4">
        <div className="w-28 shrink-0">
          <div className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated">
            {character.image ? (
              <Image
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
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-1">
          {sexApparent && (
            <span className="flex items-center gap-1 text-xs text-white/70">
              <span className={cn(
                (ICON.CHARACTER_SEX as Record<string, string>)[sexApparent],
                "charsex-" + sexApparent
              )} />
              {SEX_LABEL[sexApparent] ?? sexApparent}
              {hasSexSpoiler && spoilerLevel < 2 && <span className="text-yellow-500/70"> (?)</span>}
              {hasSexSpoiler && spoilerLevel >= 2 && sexReal && (
                <span className="text-yellow-400"> → {SEX_LABEL[sexReal] ?? sexReal}</span>
              )}
            </span>
          )}
          {birthday && <span className="text-xs text-muted">{birthday}</span>}
          {character.height != null && (
            <span className="text-xs text-muted">{character.height} cm</span>
          )}
          {character.seiyuu.length > 0 && (
            <span className="text-xs text-muted">
              CV: {character.seiyuu.map(s => s.name).join(", ")}
            </span>
          )}
          <CollectionButton type="character" id={character.id} />
        </div>
      </div>
    )
  }

  return infoContent
}
