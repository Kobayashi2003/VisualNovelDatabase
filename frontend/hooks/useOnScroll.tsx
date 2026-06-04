/** Tracks viewport scroll to drive the auto-hiding header: shown at the top of
 *  the page and whenever the user scrolls up a short distance, hidden once they
 *  scroll back down. */
"use client"

import { useState, useEffect } from "react"
import { isScrollLocked } from "@/hooks/useScrollLock"

interface UseOnScrollParams {
  /** Within this distance of the top, the header is always shown. */
  topThreshold?: number
  /** Cumulative upward scroll needed to reveal the header again mid-page. */
  revealThreshold?: number
}

interface ScrollState {
  /** True when the header should be hidden. */
  trigger: boolean
}

// Only the *viewport* scroll matters here. The detail and collection pages
// scroll inside inner `overflow-y-auto` containers at lg+, so the window never
// scrolls on them and the header stays pinned — which is what we want now that
// hiding it no longer reclaims its strip. Below lg those pages fall back to
// normal page scroll, so the auto-hide applies to them too.
export const useOnScroll = ({
  topThreshold = 30,
  revealThreshold = 64,
}: UseOnScrollParams = {}): ScrollState => {
  const [trigger, setTrigger] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    // Distance scrolled up since the last downward move; once it passes
    // `revealThreshold` we reveal the header even away from the top.
    let upDistance = 0
    let frame = 0

    const evaluate = () => {
      frame = 0
      // The page is locked behind an overlay (dialog / search drawer): it can't
      // scroll, so freeze the header state and ignore any stray events.
      if (isScrollLocked()) return

      const y = window.scrollY
      const delta = y - lastY
      lastY = y

      // Near the top: always shown, and reset the upward accumulator.
      if (y <= topThreshold) {
        upDistance = 0
        setTrigger(false)
        return
      }
      if (delta > 0) {
        // Scrolling down — hide, and forget any partial upward progress.
        upDistance = 0
        setTrigger(true)
      } else if (delta < 0) {
        // Scrolling up — reveal once the accumulated distance is enough.
        upDistance -= delta
        if (upDistance >= revealThreshold) setTrigger(false)
      }
    }

    // Coalesce the burst of scroll events into one read per frame.
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(evaluate)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    evaluate()
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [topThreshold, revealThreshold])

  return { trigger }
}
