/** Horizontal-layout image card (thumbnail left, text right) — used in list views. */
"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ImageOff, RotateCw, Lock } from "lucide-react"

interface ImageCard2Props {
  title: string
  url: string
  msgs?: string[]
  link?: string
  className?: string
  restricted?: boolean
  tooltip?: string
}

export function ImageCard2({ title, url, msgs, link, className, restricted, tooltip }: ImageCard2Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [imgUrl, setImgUrl] = useState(url)

  useEffect(() => {
    setLoading(true)
    setError(false)
    setImgUrl(url)
  }, [url])

  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) {
      setLoading(false)
      setError(false)
    }
  }, [imgUrl])

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    setError(false)
    setImgUrl(`${url}?${Date.now()}`)
  }

  const card = (
    <div className={cn(
      "bg-surface hover:bg-elevated",
      "rounded-lg p-3 border border-white/5",
      "flex flex-row gap-3",
      "hover:bg-elevated transition-all duration-300",
      link ? "cursor-pointer" : "cursor-default",
      className
    )} title={tooltip}>
      <div className="relative w-24 h-32 shrink-0 rounded overflow-hidden">
        {restricted ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-elevated gap-1">
            <Lock className="w-5 h-5 text-muted/50" />
            <span className="text-xs text-muted/50 text-center px-1 leading-tight">Login to view</span>
          </div>
        ) : (
          <>
            {imgUrl && (
              <Image
                ref={imgRef}
                src={imgUrl}
                alt={title}
                fill
                loading="lazy"
                onLoad={() => { setLoading(false); setError(false) }}
                onError={() => { setLoading(false); setError(true) }}
                className={cn("object-cover transition-opacity duration-300", loading || error ? "opacity-0" : "opacity-100")}
              />
            )}
            {(loading || !imgUrl) && (
              <div className="absolute inset-0 flex items-center justify-center bg-elevated">
                <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-elevated gap-1">
                <ImageOff className="w-6 h-6 text-muted" />
                <button onClick={handleRetry} className="p-1 rounded-full hover:bg-white/10">
                  <RotateCw className="w-3 h-3 text-muted" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <p className="font-semibold text-sm text-white line-clamp-2">{title}</p>
        {msgs?.map((msg, i) => (
          <p key={i} className="text-xs text-muted mt-1 truncate">{msg}</p>
        ))}
      </div>
    </div>
  )

  return link ? <Link href={link}>{card}</Link> : card
}
