/** 1–5 star rating control, used for personal (local) ratings. */
"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number                       // current rating; 0 = unrated
  onChange?: (value: number) => void  // omit → read-only display
  size?: number                       // star edge length in px
  className?: string
}

/** Interactive when `onChange` is given: hovering previews, clicking sets, and
 *  clicking the current value clears it back to 0. Clicks stop propagation so
 *  the control works inside a card <Link> without triggering navigation. */
export function StarRating({ value, onChange, size = 16, className }: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const readOnly = !onChange
  const shown = hover || value

  return (
    <div className={cn("flex items-center", className)} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={`Rate ${star}`}
          onMouseEnter={readOnly ? undefined : () => setHover(star)}
          onClick={readOnly ? undefined : e => {
            e.preventDefault()
            e.stopPropagation()
            onChange(star === value ? 0 : star)
          }}
          className={cn("p-0.5 leading-none", !readOnly && "cursor-pointer")}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              star <= shown ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-white/40"
            )}
          />
        </button>
      ))}
    </div>
  )
}
