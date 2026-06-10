/** Cover portrait for media detail pages (VN / Character): 3:4 image with a
 *  loading pulse, optional content-level blur, hover dim, and a click-to-open
 *  lightbox showing the full-size image. Renders the "no cover" placeholder
 *  when the entity has no image. */
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Lightbox } from "@/components/common/Lightbox"
import { ImageWithFallback } from "@/components/common/ImageWithFallback"

interface DetailCoverProps {
  image: { url: string; thumbnail?: string | null } | null | undefined
  alt: string
  /** Blur the cover (and the lightbox image) per the content-level filters. */
  blurred: boolean
  /** Anchor the crop to the top — used for character portraits. */
  objectTop?: boolean
  emptyLabel?: string
}

export function DetailCover({ image, alt, blurred, objectTop, emptyLabel = "No cover" }: DetailCoverProps) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      <div
        className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated cursor-pointer group"
        onClick={() => image && setOpen(true)}
      >
        {image ? (
          <>
            <ImageWithFallback
              src={image.thumbnail || image.url}
              alt={alt}
              fill
              className={cn(
                "object-cover transition-all duration-300",
                objectTop && "object-top",
                !loaded && "opacity-0",
                blurred && "blur-xl scale-105",
              )}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
            />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">{emptyLabel}</div>
        )}
      </div>

      {open && image && (
        <Lightbox
          images={[{ url: image.url, blurred }]}
          index={0}
          onClose={() => setOpen(false)}
          onIndexChange={() => {}}
        />
      )}
    </>
  )
}
