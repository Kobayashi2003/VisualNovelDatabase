/** Lightweight hover/focus tooltip, portalled to <body> so it escapes
 *  overflow-clipped containers (e.g. the scrolling detail sidebar). */
"use client"

import { useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface TooltipProps {
  label: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Tooltip({ label, children, className }: TooltipProps) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({ x: r.left + r.width / 2, y: r.top })
  }, [])
  const hide = useCallback(() => setCoords(null), [])

  const hasLabel = label != null && label !== ""

  return (
    <span
      ref={ref}
      className={cn("inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {coords && hasLabel && createPortal(
        <span
          role="tooltip"
          style={{ left: coords.x, top: coords.y }}
          className="fixed z-[60] -translate-x-1/2 -translate-y-full -mt-1.5
                     whitespace-nowrap rounded border border-white/10 bg-black/90
                     px-1.5 py-0.5 text-[11px] leading-tight text-white/90
                     shadow-lg pointer-events-none"
        >
          {label}
        </span>,
        document.body
      )}
    </span>
  )
}
