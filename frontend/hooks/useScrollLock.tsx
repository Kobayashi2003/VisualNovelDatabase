/** Locks background scrolling while a modal/overlay is open. */
"use client"

import { useEffect } from "react"

// Prevents the page behind an overlay from scrolling while `locked` is true.
// We cancel wheel/touch scrolling at the document (capture phase) rather than
// toggling `overflow: hidden` on <body>, because this app's detail and
// collection pages don't scroll the body — they scroll inner `overflow-y-auto`
// containers, which a body lock wouldn't touch. Scrolling *inside* `allowRef`
// (the dialog's own content) is permitted, but only while that element can
// actually scroll, so a wheel over short dialog content can't chain through to
// the background.
export function useScrollLock(
  locked: boolean,
  allowRef?: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!locked) return

    const shouldBlock = (target: EventTarget | null) => {
      const el = allowRef?.current
      if (el && target instanceof Node && el.contains(target)) {
        // Let the dialog scroll itself, but block (and prevent chaining) once it
        // has nothing left to scroll in that area.
        return el.scrollHeight <= el.clientHeight
      }
      return true
    }

    const onWheel = (e: WheelEvent) => {
      if (shouldBlock(e.target)) e.preventDefault()
    }
    const onTouchMove = (e: TouchEvent) => {
      if (shouldBlock(e.target)) e.preventDefault()
    }

    document.addEventListener("wheel", onWheel, { passive: false, capture: true })
    document.addEventListener("touchmove", onTouchMove, { passive: false, capture: true })
    return () => {
      document.removeEventListener("wheel", onWheel, true)
      document.removeEventListener("touchmove", onTouchMove, true)
    }
  }, [locked, allowRef])
}
