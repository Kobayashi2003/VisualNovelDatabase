/** Portaled modal shell with backdrop, header, and ESC-to-close. */
"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { useScrollLock } from "@/hooks/useScrollLock"

interface BaseDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  children: React.ReactNode
  className?: string
}

export function BaseDialog({ open, setOpen, title, children, className }: BaseDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const mouseDownTarget = useRef<EventTarget | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Keep the page behind the dialog from scrolling (which would otherwise drive
  // the auto-hiding header and leave the dialog interacting with a moving page).
  useScrollLock(open, panelRef)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, setOpen])

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      // Dismiss only when both the press and the release land on the backdrop,
      // so a drag that starts inside the dialog (e.g. selecting text) never
      // closes it on release.
      onMouseDown={(e) => { mouseDownTarget.current = e.target }}
      onMouseUp={(e) => {
        if (e.target === overlayRef.current && mouseDownTarget.current === overlayRef.current) {
          setOpen(false)
        }
      }}
    >
      <div ref={panelRef} className={cn(
        "relative w-full max-w-md",
        "animate-slide-up-fade",
        // The shared elevated-overlay translucency standard (see --elevated /
        // --elevated-hover in globals.css), the same one the search drawer and
        // popover menus use. `bg-[var(--elevated)]` rather than `bg-elevated` so
        // the dialog keeps its un-blurred fill over the dark modal backdrop.
        "bg-[var(--elevated)] hover:bg-[var(--elevated-hover)] transition-colors",
        "border border-white/10 rounded-xl",
        "shadow-2xl shadow-black/50",
        "max-h-[80vh] overflow-y-auto overscroll-contain",
        className
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-full text-muted hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}
