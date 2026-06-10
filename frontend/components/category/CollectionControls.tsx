/** Collection controls for detail pages: "Add to Collection" plus the user's
 *  personal rating, arranged for the two detail layouts.
 *
 *  - column (sidebar): full-width button with the "My Rating" star row below.
 *  - inline (stacked layout): the button shares a row with a compact star
 *    button that opens the rating stars in a small popover. */
"use client"

import { useEffect, useRef, useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserContext } from "@/context/UserContext"
import { StarRating } from "@/components/common/StarRating"
import { CollectionButton } from "./CollectionButton"
import { CollectionRating, useMyRating } from "./CollectionRating"

type ResourceType = "vn" | "release" | "character" | "producer" | "staff" | "tag" | "trait"

interface CollectionControlsProps {
  type: ResourceType
  id: string
  /** Inline arrangement for the stacked layout (narrow viewport / no body). */
  inline?: boolean
}

export function CollectionControls({ type, id, inline }: CollectionControlsProps) {
  const { user } = useUserContext()
  if (!user) return null

  // The mt-3 atop the panels' gap-3 column reproduces the spacing the controls
  // had before they were unified into this component.
  if (inline) {
    return (
      <div className="mt-3 flex items-stretch gap-2">
        <CollectionButton type={type} id={id} className="flex-1" />
        <RatingPopoverButton type={type} id={id} />
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-6">
      <CollectionButton type={type} id={id} />
      <CollectionRating type={type} id={id} />
    </div>
  )
}

/** Star button showing the current rating; clicking opens the star row in a
 *  popover anchored below the button (closes on pick or outside click). */
function RatingPopoverButton({ type, id }: { type: ResourceType; id: string }) {
  const { rating, changeRating } = useMyRating(type, id)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        title="My Rating"
        className={cn(
          "h-full px-3 rounded-lg flex items-center gap-1.5 text-sm font-semibold transition-colors",
          "bg-white/10 text-white hover:bg-white/20",
        )}
      >
        <Star className={cn(
          "w-4 h-4",
          rating > 0 ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-white/50",
        )} />
        {rating > 0 && <span>{rating}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-lg bg-elevated border border-white/10 shadow-xl p-2">
          <StarRating
            value={rating}
            onChange={v => { changeRating(v); setOpen(false) }}
            size={22}
          />
        </div>
      )}
    </div>
  )
}
