/** Screenshot grid (grouped by release) with a shared full-screen lightbox. */
"use client"

import { useState } from "react"
import { cn, shouldBlur } from "@/lib/utils"
import { useSearchContext } from "@/context/SearchContext"
import { displayTitle } from "@/lib/original"
import type { VN } from "@/lib/types"
import { Lightbox, type LightboxImage } from "@/components/common/Lightbox"
import { ImageWithFallback } from "@/components/common/ImageWithFallback"

type Screenshot = VN["screenshots"][number]

interface VNScreenshotsProps {
  screenshots: Screenshot[]
  sexualLevel: string
  violenceLevel: string
}

export function VNScreenshots({ screenshots, sexualLevel, violenceLevel }: VNScreenshotsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { showOriginal } = useSearchContext()

  // Flat list (across all releases) — the lightbox navigates the whole set.
  const lightboxImages: LightboxImage[] = screenshots.map(s => ({
    url: s.url,
    blurred: shouldBlur(s.sexual, s.violence, sexualLevel, violenceLevel),
    caption: displayTitle(s.release, showOriginal),
  }))

  // Group by release while preserving each screenshot's flat index.
  const groups: Array<{ releaseTitle: string; items: Array<{ screenshot: Screenshot; flatIdx: number }> }> = []
  const seenReleases = new Map<string, typeof groups[number]>()
  screenshots.forEach((s, idx) => {
    const rid = s.release.id
    if (!seenReleases.has(rid)) {
      const group = { releaseTitle: displayTitle(s.release, showOriginal), items: [] }
      groups.push(group)
      seenReleases.set(rid, group)
    }
    seenReleases.get(rid)!.items.push({ screenshot: s, flatIdx: idx })
  })

  return (
    <div className="flex flex-col gap-4">
      {groups.map(group => (
        <div key={group.releaseTitle}>
          <p className="text-xs text-muted mb-2 truncate">{group.releaseTitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map(({ screenshot: s, flatIdx }) => (
              <button
                key={flatIdx}
                onClick={() => setLightboxIndex(flatIdx)}
                className="relative w-24 h-14 rounded overflow-hidden bg-elevated shrink-0 hover:ring-2 hover:ring-accent transition-all"
                title={group.releaseTitle}
              >
                <ImageWithFallback
                  src={s.thumbnail}
                  alt={`Screenshot ${flatIdx + 1}`}
                  fill
                  className={cn(
                    "object-cover transition-all duration-300",
                    lightboxImages[flatIdx].blurred && "blur-md scale-105",
                  )}
                  sizes="96px"
                />
              </button>
            ))}
          </div>
        </div>
      ))}

      {lightboxIndex != null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  )
}
