/** Single-line dense row used by the collection page's "compact" view. */
"use client"

import Image from "next/image"
import Link from "next/link"
import { X, FolderInput, Check } from "lucide-react"
import { cn, formatRelativeDate } from "@/lib/utils"
import { StarRating } from "@/components/common/StarRating"

interface CompactRowProps {
  index: number
  title: string
  subtitle?: string
  thumbnail?: string           // undefined = no thumbnail column; empty string = placeholder
  badges?: string[]
  markedAt?: string
  rating?: number
  onRate?: (value: number) => void
  link?: string
  selected?: boolean
  editMode?: boolean
  onRemove?: () => void
  onMove?: () => void
  onToggleSelect?: () => void
  className?: string
}

export function CompactRow({
  index, title, subtitle, thumbnail, badges, markedAt, rating, onRate,
  link, selected, editMode, onRemove, onMove, onToggleSelect, className
}: CompactRowProps) {
  const rowClick = editMode ? (e: React.MouseEvent) => { e.preventDefault(); onToggleSelect?.() } : undefined

  return (
    <div
      onClick={rowClick}
      className={cn(
        "flex items-center gap-3 px-2 py-1.5 rounded-lg group transition-colors",
        selected ? "bg-accent/15" : "hover:bg-white/5",
        editMode && "cursor-pointer",
        className
      )}
    >
      <div className="w-6 shrink-0 flex items-center justify-center">
        {editMode ? (
          <div className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
            selected
              ? "bg-accent border-accent"
              : "border-white/40 group-hover:border-white/70"
          )}>
            {selected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
          </div>
        ) : (
          <span className="text-sm text-muted text-right select-none w-full">{index}</span>
        )}
      </div>

      {thumbnail !== undefined && (
        <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-white/5">
          {thumbnail ? (
            <Image src={thumbnail} alt={title || ""} width={40} height={56} className="w-full h-full object-cover" unoptimized />
          ) : (
            <div className="w-full h-full bg-white/10" />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {link && !editMode ? (
          <Link href={link} className="text-sm font-medium text-white hover:underline line-clamp-1">
            {title}
          </Link>
        ) : (
          <div className="text-sm font-medium text-white line-clamp-1">{title}</div>
        )}
        {subtitle && (
          <div className="text-xs text-muted line-clamp-1 mt-0.5">{subtitle}</div>
        )}
      </div>

      {badges && badges.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {badges.map((b, i) => (
            <span key={i} className="text-xs text-muted bg-white/5 px-1.5 py-0.5 rounded">{b}</span>
          ))}
        </div>
      )}

      {onRate && (
        <div className={cn(
          "hidden sm:flex items-center shrink-0 transition-opacity",
          (rating ?? 0) > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <StarRating value={rating ?? 0} onChange={onRate} size={13} />
        </div>
      )}

      {markedAt && (
        <div className="hidden lg:block text-xs text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-28 text-right">
          {formatRelativeDate(markedAt)}
        </div>
      )}

      {!editMode && (onRemove || onMove) && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {onMove && (
            <button
              onClick={onMove}
              className="p-1 rounded text-muted hover:text-white hover:bg-white/10 transition-colors"
              title="Move to..."
            >
              <FolderInput className="w-3.5 h-3.5" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
