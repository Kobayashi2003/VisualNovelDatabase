/** next/image wrapper that replaces the browser's broken-image glyph with a
 *  themed placeholder and a one-tap reload, instead of a torn-icon. Drop-in for
 *  `<Image>`; works with `fill` or explicit width/height. */
"use client"

import { useCallback, useState } from "react"
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
  className, fallbackClassName, alt, fill, onError, onLoad, ...props
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // Bumping the key remounts the <img>, forcing a fresh network attempt.
  const [reloadKey, setReloadKey] = useState(0)

  // A cached image can finish loading before React attaches onLoad; this ref
  // catches that case so the image still reveals (no perpetual hidden state).
  // Stable identity is fine — the `key={reloadKey}` remount re-runs it anyway.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [])

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
          // Stop both events so a reload inside a clickable parent never also
          // triggers it: stopPropagation blocks React bubbling (e.g. a graph
          // node's onClick), and preventDefault blocks the browser's default
          // anchor navigation when this sits inside a <Link>.
          onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
          onClick={e => { e.preventDefault(); e.stopPropagation(); setFailed(false); setLoaded(false); setReloadKey(k => k + 1) }}
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
      ref={imgRef}
      alt={alt}
      fill={fill}
      // Kept invisible until it actually loads, so a failed src never flashes
      // the browser's native broken-image glyph before the fallback takes over.
      className={cn(className, !loaded && "opacity-0")}
      onLoad={e => { setLoaded(true); onLoad?.(e) }}
      onError={() => { setFailed(true); onError?.() }}
      {...props}
    />
  )
}
