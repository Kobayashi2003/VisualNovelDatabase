/** Toggle for where VNDB images load from — the imgserve proxy or VNDB directly. */

import { cn } from "@/lib/utils"
import type { ImageSource } from "@/lib/types"

const SOURCES: { value: ImageSource; label: string }[] = [
  { value: "imgserve", label: "Proxy" },
  { value: "direct", label: "Direct" },
]

interface ImageSourceSelectorProps {
  imageSource: ImageSource
  setImageSource: (source: ImageSource) => void
  className?: string
}

export function ImageSourceSelector({ imageSource, setImageSource, className }: ImageSourceSelectorProps) {
  return (
    <div className={cn(
      "flex flex-row items-center rounded-full border border-white/10 overflow-hidden",
      className
    )}>
      {SOURCES.map((source) => (
        <button
          key={source.value}
          onClick={() => setImageSource(source.value)}
          className={cn(
            "flex-1 px-2.5 py-1.5 text-xs font-medium text-center transition-all duration-200",
            imageSource === source.value
              ? "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          {source.label}
        </button>
      ))}
    </div>
  )
}
