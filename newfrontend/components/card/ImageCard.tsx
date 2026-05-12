"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ImageOff, RotateCw } from "lucide-react"

interface ImageCardProps {
  title: string
  url: string
  msgs?: string[]
  link?: string
  className?: string
}

export function ImageCard({ title, url, msgs, link, className }: ImageCardProps) {
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
      "rounded-lg p-2 border border-white/5",
      "hover:scale-105 transition-all duration-300",
      link ? "cursor-pointer" : "cursor-default",
      className
    )}>
      <div className="relative w-full aspect-square rounded overflow-hidden">
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
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-elevated gap-2">
            <ImageOff className="w-8 h-8 text-muted" />
            <button onClick={handleRetry} className="p-1 rounded-full hover:bg-white/10">
              <RotateCw className="w-4 h-4 text-muted" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 px-1">
        <p className="truncate font-semibold text-xs sm:text-sm text-white">{title}</p>
        {msgs?.map((msg, i) => (
          <p key={i} className="truncate text-xs text-muted">{msg}</p>
        ))}
      </div>
    </div>
  )

  return link ? <Link href={link}>{card}</Link> : card
}
