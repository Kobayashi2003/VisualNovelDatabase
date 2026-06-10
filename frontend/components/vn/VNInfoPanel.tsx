/** VN detail sidebar: cover, rating + status + metadata card, relations, links,
 *  collection controls. The `inline` arrangement (stacked layout) puts the
 *  cover beside the info card from `sm` up. */
"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Network } from "lucide-react"
import { cn, shouldBlur, formatPlaytime } from "@/lib/utils"
import { useSearchContext } from "@/context/SearchContext"
import { displayTitle, displayName } from "@/lib/original"
import { CollectionControls } from "@/components/category/CollectionControls"
import { enumMap } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { InfoCard, TitledCard, InfoRow, InlineList } from "@/components/detail/InfoPrimitives"
import { DetailCover } from "@/components/detail/DetailCover"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { PlatformIcons } from "@/components/common/PlatformIcons"
import { ExtLinks } from "@/components/common/ExtLinks"
import type { VN } from "@/lib/types"

interface VNInfoPanelProps {
  vn: VN
  sexualLevel: string
  violenceLevel: string
  /** Inline arrangement for the stacked layout (cover left of the info card from `sm` up). */
  inline?: boolean
}

export function VNInfoPanel({ vn, sexualLevel, violenceLevel, inline }: VNInfoPanelProps) {
  const [ratingHidden, setRatingHidden] = useState(true)
  const blur = vn.image ? shouldBlur(vn.image.sexual, vn.image.violence, sexualLevel, violenceLevel) : false

  const DEVSTATUS = enumMap('DEVSTATUS')
  const LENGTH = enumMap('LENGTH')
  const RELATION = enumMap('RELATION')
  const LANG_ICON = ICON.LANGUAGE as Record<string, string>
  const { showOriginal } = useSearchContext()

  const devstatusLabel = DEVSTATUS[vn.devstatus]
  const devstatusColor =
    vn.devstatus === 0 ? "bg-green-500/20 text-green-400" :
      vn.devstatus === 1 ? "bg-yellow-500/20 text-yellow-400" :
        "bg-red-500/20 text-red-400"

  // Group relations by type
  const relationGroups = vn.relations.reduce<Record<string, typeof vn.relations>>((acc, r) => {
    const key = RELATION[r.relation] ?? r.relation
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  /* ─── Shared pieces — defined once so the column and inline arrangements show
   *     the same data; only the cover placement differs. ─────────────────── */

  const cover = <DetailCover image={vn.image} alt={vn.title} blurred={blur} />

  // Rating + dev status live as the first rows of the info card rather than
  // floating above it. Rating stays blurred until the eye toggle reveals it.
  const metaCard = (
    <InfoCard>
      <InfoRow label="Rating">
        <span className="flex items-center gap-1.5 w-full">
          {vn.average != null ? (
            <>
              <span className={cn("font-semibold text-white transition-all", ratingHidden && "blur-sm select-none")}>
                {vn.average.toFixed(2)}
              </span>
              <span className="text-muted">/ 100</span>
              {vn.votecount > 0 && (
                <span className={cn("text-muted transition-all", ratingHidden && "blur-sm select-none")}>
                  ({vn.votecount.toLocaleString()})
                </span>
              )}
            </>
          ) : (
            <span className="text-muted">No rating</span>
          )}
          <button
            onClick={() => setRatingHidden(h => !h)}
            className="ml-auto p-0.5 rounded text-muted hover:text-white transition-colors"
            title={ratingHidden ? "Show rating" : "Hide rating"}
          >
            {ratingHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </span>
      </InfoRow>
      {devstatusLabel && (
        <InfoRow label="Status">
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", devstatusColor)}>
            {devstatusLabel}
          </span>
        </InfoRow>
      )}
      {vn.released && (
        <InfoRow label="Released">{vn.released}</InfoRow>
      )}
      {(vn.length != null || vn.length_minutes != null) && (
        <InfoRow label="Length">
          {vn.length != null && (LENGTH[vn.length] ?? String(vn.length))}
          {vn.length_minutes != null && vn.length_minutes > 0 && (
            <span className="text-muted">
              {vn.length != null && " "}
              {vn.length != null ? "(" : ""}
              {formatPlaytime(vn.length_minutes)}
              {vn.length_votes > 0 && ` from ${vn.length_votes} votes`}
              {vn.length != null ? ")" : ""}
            </span>
          )}
        </InfoRow>
      )}
      {vn.platforms.length > 0 && (
        <InfoRow label="Platforms">
          <PlatformIcons platforms={vn.platforms} />
        </InfoRow>
      )}
      {vn.languages.length > 0 && (
        <InfoRow label="Languages">
          <LanguageIcons langs={vn.languages} olang={vn.olang} />
        </InfoRow>
      )}
      {vn.developers.length > 0 && (
        <InfoRow label="Developer" stacked>
          <InlineList items={vn.developers.map(d => (
            <Link key={d.id} href={`/${d.id}`} className="text-white/90 hover:text-accent transition-colors">
              {displayName(d, showOriginal)}
            </Link>
          ))} />
        </InfoRow>
      )}
      {vn.publishers.length > 0 && (
        <InfoRow label="Publisher" stacked>
          <div className="flex flex-col gap-1 w-full">
            {vn.publishers.map(pub => (
              <Link key={pub.id} href={`/${pub.id}`}
                className="flex items-center gap-1.5 hover:text-accent transition-colors">
                <div className="flex gap-0.5 shrink-0">
                  {pub.languages.slice(0, 3).map(l =>
                    LANG_ICON[l] ? <span key={l} className={LANG_ICON[l]} /> : null
                  )}
                </div>
                <span className="truncate">{displayName(pub, showOriginal)}</span>
              </Link>
            ))}
          </div>
        </InfoRow>
      )}
      {vn.aliases.length > 0 && (
        <InfoRow label="Aliases" stacked>
          <InlineList className="text-white/70" items={vn.aliases} />
        </InfoRow>
      )}
    </InfoCard>
  )

  const relationsCard = Object.keys(relationGroups).length > 0 && (
    <TitledCard
      title="Relations"
      action={
        <Link
          href={`/${vn.id}/rg`}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors"
        >
          <Network className="w-3 h-3" />
          Graph
        </Link>
      }
    >
      {Object.entries(relationGroups).map(([relType, items]) => (
        <div key={relType} className="mb-2 last:mb-0">
          <p className="text-xs text-muted mb-1">{relType}</p>
          <div className="flex flex-col gap-0.5">
            {items.map(r => (
              <Link
                key={r.id}
                href={`/${r.id}`}
                className={cn(
                  "text-xs text-white/80 hover:text-accent transition-colors truncate",
                  // Dim unofficial relations, mirroring the releases list's
                  // treatment of unofficial releases. relation_official is
                  // carried per relation entry (this VN's own list), so no
                  // current-VN lookup is needed.
                  !r.relation_official && "opacity-60",
                )}
                title={r.relation_official ? undefined : "Unofficial relation"}
              >
                {displayTitle(r, showOriginal)}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </TitledCard>
  )

  // Cards + links + collection controls below the cover — identical in both arrangements.
  const belowCover = (
    <>
      {relationsCard}
      {vn.extlinks.length > 0 && <ExtLinks links={vn.extlinks} />}
      <CollectionControls type="vn" id={vn.id} inline={inline} />
    </>
  )

  if (inline) {
    return (
      <div className="flex flex-col gap-3">
        {/* Phones (< sm): cover centred on top, info card full-width below.
            From sm up: cover left, info right. */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="w-40 shrink-0 sm:w-32">{cover}</div>
          <div className="w-full min-w-0 sm:flex-1">{metaCard}</div>
        </div>
        {belowCover}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {cover}
      {metaCard}
      {belowCover}
    </div>
  )
}
