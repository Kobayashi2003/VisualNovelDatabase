/** VN detail sidebar: cover, rating + status + metadata card, relations, links, collection button. */
"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff, Network } from "lucide-react"
import { cn, shouldBlur, formatPlaytime } from "@/lib/utils"
import { useSearchContext } from "@/context/SearchContext"
import { displayTitle, displayName } from "@/lib/original"
import { CollectionButton } from "@/components/category/CollectionButton"
import { CollectionRating } from "@/components/category/CollectionRating"
import { enumMap } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { InfoRow, InlineList } from "@/components/common/InfoPrimitives"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { PlatformIcons } from "@/components/common/PlatformIcons"
import { ExtLinks } from "@/components/common/ExtLinks"
import { Lightbox } from "@/components/common/Lightbox"
import type { VN } from "@/lib/types"


/* ─── Main panel ───────────────────────────────────────────────────────────── */

interface VNInfoPanelProps {
  vn: VN
  sexualLevel: string
  violenceLevel: string
  mobile?: boolean
}

export function VNInfoPanel({ vn, sexualLevel, violenceLevel, mobile }: VNInfoPanelProps) {
  const [ratingHidden, setRatingHidden] = useState(true)
  const [coverOpen, setCoverOpen] = useState(false)
  const blur = vn.image ? shouldBlur(vn.image.sexual, vn.image.violence, sexualLevel, violenceLevel) : false
  const [imgLoaded, setImgLoaded] = useState(false)

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

  /* ─── Shared pieces — defined once so the desktop and mobile layouts show the
   *     same data; only the cover arrangement differs. ───────────────────── */

  const lightbox = coverOpen && vn.image && (
    <Lightbox
      images={[{ url: vn.image.url, blurred: blur }]}
      index={0}
      onClose={() => setCoverOpen(false)}
      onIndexChange={() => {}}
    />
  )

  // Rating + dev status now live as the first rows of the info card rather than
  // floating above it. Rating stays blurred until the eye toggle reveals it.
  const metaCard = (
    <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
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
      {vn.developers.length > 0 && (
        <InfoRow label="Developer">
          <InlineList items={vn.developers.map(d => (
            <Link key={d.id} href={`/${d.id}`} className="text-white/90 hover:text-accent transition-colors">
              {displayName(d, showOriginal)}
            </Link>
          ))} />
        </InfoRow>
      )}
      {vn.publishers.length > 0 && (
        <InfoRow label="Publisher">
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
      {vn.aliases.length > 0 && (
        <InfoRow label="Aliases">
          <InlineList className="text-white/70" items={vn.aliases} />
        </InfoRow>
      )}
    </div>
  )

  const relationsCard = Object.keys(relationGroups).length > 0 && (
    <div className="rounded-lg bg-surface border border-white/5 px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Relations</p>
        <Link
          href={`/${vn.id}/rg`}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors"
        >
          <Network className="w-3 h-3" />
          Graph
        </Link>
      </div>
      {Object.entries(relationGroups).map(([relType, items]) => (
        <div key={relType} className="mb-2 last:mb-0">
          <p className="text-xs text-muted mb-1">{relType}</p>
          <div className="flex flex-col gap-0.5">
            {items.map(r => (
              <Link key={r.id} href={`/${r.id}`} className="text-xs text-white/80 hover:text-accent transition-colors truncate">
                {displayTitle(r, showOriginal)}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const extLinksBlock = vn.extlinks.length > 0 && <ExtLinks links={vn.extlinks} />

  // Cards + links + collection controls below the cover — identical in both layouts.
  const belowCover = (
    <>
      {relationsCard}
      {extLinksBlock}
      <CollectionButton type="vn" id={vn.id} />
      <CollectionRating type="vn" id={vn.id} />
    </>
  )

  if (mobile) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <div className="w-32 shrink-0">
            <div
              className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated cursor-pointer"
              onClick={() => vn.image && setCoverOpen(true)}
            >
              {vn.image ? (
                <Image
                  src={vn.image.thumbnail || vn.image.url}
                  alt={vn.title}
                  fill
                  className={cn("object-cover", blur && "blur-xl scale-105")}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">No cover</div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">{metaCard}</div>
        </div>
        {lightbox}
        {belowCover}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated cursor-pointer group"
        onClick={() => vn.image && setCoverOpen(true)}
      >
        {vn.image ? (
          <>
            <Image
              src={vn.image.thumbnail || vn.image.url}
              alt={vn.title}
              fill
              className={cn(
                "object-cover transition-all duration-300",
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
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">No cover</div>
        )}
      </div>

      {lightbox}
      {metaCard}
      {belowCover}
    </div>
  )
}
