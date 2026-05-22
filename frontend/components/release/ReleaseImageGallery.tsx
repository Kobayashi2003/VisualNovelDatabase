/** Release image gallery: thumbnail strip + shared full-screen lightbox. */
"use client"

import { useState } from "react"
import Image from "next/image"
import { cn, shouldBlur } from "@/lib/utils"
import type { Release } from "@/lib/types"
import { Lightbox, type LightboxImage } from "@/components/common/Lightbox"

type ReleaseImage = Release["images"][number]

interface ReleaseImageGalleryProps {
  images: ReleaseImage[]
  sexualLevel: string
  violenceLevel: string
}

export function ReleaseImageGallery({ images, sexualLevel, violenceLevel }: ReleaseImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const lightboxImages: LightboxImage[] = images.map(img => ({
    url: img.url,
    blurred: shouldBlur(img.sexual, img.violence, sexualLevel, violenceLevel),
  }))

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightboxIndex(i)}
            className="relative w-24 h-14 rounded overflow-hidden bg-elevated shrink-0 hover:ring-2 hover:ring-accent transition-all"
          >
            <Image
              src={img.thumbnail}
              alt={`Image ${i + 1}`}
              fill
              className={cn(
                "object-cover transition-all duration-300",
                lightboxImages[i].blurred && "blur-md scale-105",
              )}
              sizes="96px"
            />
          </button>
        ))}
      </div>

      {lightboxIndex != null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </>
  )
}
