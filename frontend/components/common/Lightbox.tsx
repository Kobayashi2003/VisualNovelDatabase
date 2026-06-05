/** Full-screen image lightbox with keyboard navigation, portalled to <body>.
 *  Shared by VN screenshots, release images, and detail-page cover viewers. */
"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LightboxImage {
  /** Full-resolution image URL. */
  url: string
  /** Blur the image for content-rating reasons. */
  blurred?: boolean
  /** Optional caption shown beneath the counter. */
  caption?: React.ReactNode
}

interface LightboxProps {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function Lightbox({ images, index, onClose, onIndexChange }: LightboxProps) {
  const [mounted, setMounted] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => setLoaded(false), [index])

  const count = images.length
  const prev = useCallback(() => onIndexChange((index - 1 + count) % count), [index, count, onIndexChange])
  const next = useCallback(() => onIndexChange((index + 1) % count), [index, count, onIndexChange])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose, prev, next])

  /* ── Render ────────────────────────────────────────────────────────────── */

  if (!mounted) return null
  const img = images[index]
  if (!img) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        aria-label="Close"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {count > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prev() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Plain <img> so the image loads reliably inside the portal. */}
      <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {!loaded && <div className="absolute w-10 h-10 rounded-full bg-white/10 animate-pulse" />}
        <img
          src={img.url}
          alt={`Image ${index + 1}`}
          className={cn(
            "max-w-[90vw] max-h-[85vh] object-contain rounded-lg transition-all duration-300",
            !loaded && "opacity-0",
            img.blurred && "blur-xl scale-105",
          )}
          onLoad={() => setLoaded(true)}
        />
      </div>

      {count > 1 && (
        <button
          onClick={e => { e.stopPropagation(); next() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {(count > 1 || img.caption) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          {count > 1 && <span className="text-xs text-white/60">{index + 1} / {count}</span>}
          {img.caption && <span className="text-xs text-white/40">{img.caption}</span>}
        </div>
      )}
    </div>,
    document.body
  )
}
