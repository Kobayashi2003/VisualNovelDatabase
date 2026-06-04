/** next/image wrapper that replaces the browser's broken-image glyph with a
 *  themed placeholder and a one-tap reload, instead of a torn-icon. Drop-in for
 *  `<Image>`; works with `fill` or explicit width/height. */
"use client"

import { useState } from "react"
import Image, { type ImageProps } from "next/image"
import { ImageOff, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type ImageWithFallbackProps = Omit<ImageProps, "onError"> & {
  /** Extra classes for the fallback box (sizing for the non-`fill` case). */
  fallbackClassName?: string
  /** Notified when the image fails — e.g. to dismiss a parent's loading skeleton. */
  onError?: () => void
}

export function ImageWithFallback({
  className, fallbackClassName, alt, fill, onError, ...props
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false)
  // Bumping the key remounts the <img>, forcing a fresh network attempt.
  const [reloadKey, setReloadKey] = useState(0)

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-elevated text-muted select-none",
          fill && "absolute inset-0",
          fallbackClassName,
        )}
      >
        <ImageOff className="w-5 h-5 opacity-40" />
        <button
          type="button"
          // Stop both events so a reload inside a clickable parent (e.g. a graph
          // node) never also triggers the parent's click / navigation.
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setFailed(false); setReloadKey(k => k + 1) }}
          className="flex items-center gap-1 text-[10px] font-medium text-muted hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Reload
        </button>
      </div>
    )
  }

  return (
    <Image
      key={reloadKey}
      alt={alt}
      fill={fill}
      className={className}
      onError={() => { setFailed(true); onError?.() }}
      {...props}
    />
  )
}
