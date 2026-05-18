/** Screenshot grid with a keyboard-navigable lightbox. */
"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn, shouldBlur } from "@/lib/utils"
import type { VN } from "@/lib/types"

type Screenshot = VN["screenshots"][number]


/* ─── Lightbox ─────────────────────────────────────────────────────────────── */

function Lightbox({
  screenshots, index, onClose, onPrev, onNext,
  sexualLevel, violenceLevel,
}: {
  screenshots: Screenshot[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  sexualLevel: string
  violenceLevel: string
}) {
  const s = screenshots[index]
  const blurred = shouldBlur(s.sexual, s.violence, sexualLevel, violenceLevel)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
  }, [index])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "ArrowRight") onNext()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose, onPrev, onNext])

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Prev */}
      {screenshots.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onPrev() }}
          className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Image — plain <img> so it loads reliably inside createPortal */}
      <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {!loaded && (
          <div className="absolute w-10 h-10 rounded-full bg-white/10 animate-pulse" />
        )}
        <img
          src={s.url}
          alt={`Screenshot ${index + 1}`}
          className={cn(
            "max-w-[90vw] max-h-[85vh] object-contain transition-all duration-300",
            !loaded && "opacity-0",
            blurred && "blur-xl scale-105"
          )}
          onLoad={() => setLoaded(true)}
        />
      </div>

      {/* Next */}
      {screenshots.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNext() }}
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Counter + release label */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <span className="text-xs text-white/60">{index + 1} / {screenshots.length}</span>
        <span className="text-xs text-white/40">{s.release.title}</span>
      </div>
    </div>,
    document.body
  )
}

/* ─── Component ────────────────────────────────────────────────────────────── */
interface VNScreenshotsProps {
  screenshots: Screenshot[]
  sexualLevel: string
  violenceLevel: string
}

export function VNScreenshots({ screenshots, sexualLevel, violenceLevel }: VNScreenshotsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Flat list for lightbox navigation (all screenshots across all releases)
  const flatScreenshots = screenshots

  const open = useCallback((i: number) => setLightboxIndex(i), [])
  const close = useCallback(() => setLightboxIndex(null), [])
  const prev = useCallback(() => setLightboxIndex(i => i != null ? (i - 1 + flatScreenshots.length) % flatScreenshots.length : null), [flatScreenshots.length])
  const next = useCallback(() => setLightboxIndex(i => i != null ? (i + 1) % flatScreenshots.length : null), [flatScreenshots.length])

  // Group by release while preserving flat index
  const groups: Array<{ releaseTitle: string; items: Array<{ screenshot: Screenshot; flatIdx: number }> }> = []
  const seenReleases = new Map<string, typeof groups[number]>()

  screenshots.forEach((s, idx) => {
    const rid = s.release.id
    if (!seenReleases.has(rid)) {
      const group = { releaseTitle: s.release.title, items: [] }
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
            {group.items.map(({ screenshot: s, flatIdx }) => {
              const blurred = shouldBlur(s.sexual, s.violence, sexualLevel, violenceLevel)
              // Thumbnail cells: fixed small size to avoid upscaling low-res thumbnails
              return (
                <button
                  key={flatIdx}
                  onClick={() => open(flatIdx)}
                  className="relative w-24 h-14 rounded overflow-hidden bg-elevated shrink-0 hover:ring-2 hover:ring-accent transition-all"
                  title={s.release.title}
                >
                  <Image
                    src={s.thumbnail}
                    alt={`Screenshot ${flatIdx + 1}`}
                    fill
                    className={cn(
                      "object-cover transition-all duration-300",
                      blurred && "blur-md scale-105"
                    )}
                    sizes="96px"
                  />
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {lightboxIndex != null && (
        <Lightbox
          screenshots={flatScreenshots}
          index={lightboxIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
          sexualLevel={sexualLevel}
          violenceLevel={violenceLevel}
        />
      )}
    </div>
  )
}
