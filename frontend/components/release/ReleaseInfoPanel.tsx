/** Release detail sidebar: release metadata rows + external links. */

import { cn } from "@/lib/utils"
import { enumMap, enumLabel } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import type { Release } from "@/lib/types"
import { InfoRow, InlineList } from "@/components/common/InfoPrimitives"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { PlatformIcons } from "@/components/common/PlatformIcons"
import { ExtLinks } from "@/components/common/ExtLinks"

export function ReleaseInfoPanel({ release }: { release: Release }) {
  const rtypes = [...new Set(release.vns.map(v => v.rtype))]
  const ageLabel = release.minage == null ? null : release.minage === 0 ? "All Ages" : `${release.minage}+`
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
    !!release.released || rtypes.length > 0 || !!ageLabel ||
    release.platforms.length > 0 || release.languages.length > 0 ||
    release.media.length > 0 || !!resoDisplay || !!release.engine ||
    release.voiced != null || release.freeware != null ||
    !!release.gtin || !!release.catalog

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
      <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
        {release.released && (
          <InfoRow label="Released">{release.released}</InfoRow>
        )}

        {rtypes.length > 0 && (
          <InfoRow label="Type">
            <div className="flex gap-2 flex-wrap">
              {rtypes.map(rt => (
                <span key={rt} className={cn(
                  "text-xs font-medium",
                  rt === "complete" ? "text-green-400" :
                  rt === "trial" ? "text-blue-400" :
                  rt === "partial" ? "text-yellow-400" : "text-white/80"
                )}>
                  {enumLabel('RTYPE', rt)}
                </span>
              ))}
            </div>
          </InfoRow>
        )}

        {ageLabel && (
          <InfoRow label="Age Rating">
            <span className={cn(
              "text-xs font-medium",
              release.minage === 0 ? "text-green-400" :
              (release.minage ?? 0) >= 18 ? "text-red-400" :
              (release.minage ?? 0) >= 17 ? "text-orange-400" :
              (release.minage ?? 0) >= 15 ? "text-yellow-400" : "text-white/80"
            )}>
              {ageLabel}
            </span>
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
      </div>
      )}

      <ExtLinks links={release.extlinks} />
    </div>
  )
}
