/** Release detail sidebar: metadata rows, linked visual novels, producers,
 *  external links, all in one column. */
"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { enumMap, enumLabel } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { displayTitle, displayName } from "@/lib/original"
import { useSearchContext } from "@/context/SearchContext"
import type { Release } from "@/lib/types"
import { InfoCard, TitledCard, InfoRow, InlineList } from "@/components/detail/InfoPrimitives"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { PlatformIcons } from "@/components/common/PlatformIcons"
import { ExtLinks } from "@/components/common/ExtLinks"
import { AgeRatingBadge } from "@/components/common/AgeRatingBadge"

const RTYPE_COLOR: Record<string, string> = {
  complete: "text-green-400",
  trial: "text-blue-400",
  partial: "text-yellow-400",
}

export function ReleaseInfoPanel({ release }: { release: Release }) {
  const { showOriginal } = useSearchContext()
  const rtypes = [...new Set(release.vns.map(v => v.rtype))]
  const VOICED = enumMap('VOICED')
  const MEDIUM = enumMap('MEDIUM')
  const MEDIA_ICON = ICON.RELEASE_MEDIA as Record<string, string>
  const VOICED_ICON = ICON.RELEASE_VOICED as Record<number, string>

  // Detect resolution aspect ratio
  let resoIcon: string | null = null
  let resoDisplay: string | null = null
  if (release.resolution) {
    const raw = Array.isArray(release.resolution)
      ? `${(release.resolution as unknown as number[])[0]}x${(release.resolution as unknown as number[])[1]}`
      : String(release.resolution)
    const m = raw.match(/^(\d+)x(\d+)$/)
    if (m) {
      resoDisplay = `${m[1]} × ${m[2]}`
      const ratio = Number(m[1]) / Number(m[2])
      if (Math.abs(ratio - 16 / 9) < 0.05) resoIcon = "icon-rel-reso-169"
      else if (Math.abs(ratio - 4 / 3) < 0.05) resoIcon = "icon-rel-reso-43"
      else resoIcon = "icon-rel-reso-custom"
    } else {
      resoDisplay = raw
    }
  }

  const hasInfo =
    !!release.released || rtypes.length > 0 || release.minage != null ||
    release.platforms.length > 0 || release.languages.length > 0 ||
    release.media.length > 0 || !!resoDisplay || !!release.engine ||
    release.voiced != null || release.freeware != null ||
    !!release.gtin || !!release.catalog

  const producers = release.producers ?? []
  const developers = producers.filter(p => p.developer)
  const publishers = producers.filter(p => p.publisher)

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
      <InfoCard>
        {release.released && (
          <InfoRow label="Released">{release.released}</InfoRow>
        )}

        {rtypes.length > 0 && (
          <InfoRow label="Type">
            <div className="flex gap-2 flex-wrap">
              {rtypes.map(rt => (
                <span key={rt} className={cn("text-xs font-medium", RTYPE_COLOR[rt] ?? "text-white/80")}>
                  {enumLabel('RTYPE', rt)}
                </span>
              ))}
            </div>
          </InfoRow>
        )}

        {release.minage != null && (
          <InfoRow label="Age Rating">
            <AgeRatingBadge minage={release.minage} uncensored={release.uncensored} variant="text" />
          </InfoRow>
        )}

        {release.platforms.length > 0 && (
          <InfoRow label="Platforms">
            <PlatformIcons platforms={release.platforms} />
          </InfoRow>
        )}

        {release.languages.length > 0 && (
          <InfoRow label="Languages">
            <LanguageIcons langs={release.languages} />
          </InfoRow>
        )}

        {release.media.length > 0 && (
          <InfoRow label="Media">
            <InlineList items={release.media.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {MEDIA_ICON[m.medium] && <span className={MEDIA_ICON[m.medium]} />}
                {MEDIUM[m.medium] ?? m.medium}
                {m.qty ? ` ×${m.qty}` : ""}
              </span>
            ))} />
          </InfoRow>
        )}

        {resoDisplay && (
          <InfoRow label="Resolution">
            <span className="flex items-center gap-1">
              {resoIcon && <span className={resoIcon} />}
              {resoDisplay}
            </span>
          </InfoRow>
        )}

        {release.engine && (
          <InfoRow label="Engine">{release.engine}</InfoRow>
        )}

        {release.voiced != null && (
          <InfoRow label="Voiced">
            <span className="flex items-center gap-1.5">
              <span className={VOICED_ICON[release.voiced] ?? "icon-rel-voiced"} />
              {VOICED[release.voiced] ?? String(release.voiced)}
            </span>
          </InfoRow>
        )}

        {release.freeware != null && (
          <InfoRow label="Publication">
            <span className="flex items-center gap-1.5 text-xs">
              <span className={release.freeware ? "icon-rel-free" : "icon-rel-nonfree"} />
              <span className={release.freeware ? "text-green-400" : "text-white/80"}>
                {release.freeware ? "Freeware" : "Non-free commercial"}
              </span>
            </span>
          </InfoRow>
        )}

        {release.gtin && (
          <InfoRow label="GTIN">{release.gtin}</InfoRow>
        )}

        {release.catalog && (
          <InfoRow label="Catalog">{release.catalog}</InfoRow>
        )}
      </InfoCard>
      )}

      {release.vns.length > 0 && (
        <TitledCard title="Visual Novels">
          <div className="flex flex-col gap-1">
            {release.vns.map(vn => (
              <Link
                key={vn.id}
                href={`/${vn.id}`}
                className="flex items-baseline gap-2 text-xs text-white/80 hover:text-accent transition-colors"
              >
                <span className="truncate">{displayTitle(vn, showOriginal)}</span>
                <span className={cn("shrink-0 ml-auto", RTYPE_COLOR[vn.rtype] ?? "text-white/50")}>
                  {enumLabel('RTYPE', vn.rtype)}
                </span>
              </Link>
            ))}
          </div>
        </TitledCard>
      )}

      {producers.length > 0 && (
        <TitledCard title="Producers">
          {[
            { label: "Developer", list: developers },
            { label: "Publisher", list: publishers },
          ].filter(g => g.list.length > 0).map(g => (
            <div key={g.label} className="mb-2 last:mb-0">
              <p className="text-xs text-muted mb-1">{g.label}</p>
              <div className="flex flex-col gap-0.5">
                {g.list.map(p => (
                  <Link
                    key={p.id}
                    href={`/${p.id}`}
                    className="text-xs text-white/80 hover:text-accent transition-colors truncate"
                  >
                    {displayName(p, showOriginal)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </TitledCard>
      )}

      <ExtLinks links={release.extlinks} />
    </div>
  )
}
