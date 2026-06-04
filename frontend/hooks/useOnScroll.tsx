/** Hook that tracks vertical scroll position, direction, and a debounced trigger flag. */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { isScrollLocked } from "@/hooks/useScrollLock"

interface UseOnScrollParams {
  scrollThreshold?: number
  debounceTime?: number
  throttleTime?: number
}

interface ScrollState {
  trigger: boolean
  scrollY: number
  scrollDirection: "up" | "down" | null
}

// How long to freeze the trigger after it flips, covering the header's 300ms
// show/hide transition plus a small buffer, so the resulting layout resize can't
// bounce it back.
const SETTLE_MS = 350

// `trigger` flips true once the user has scrolled past `scrollThreshold`
// downward, and back to false as soon as they scroll upward at all — the
// "hide on scroll down, show on scroll up" pattern.
//
// Listens in the *capture* phase on `document` so it sees scrolling from any
// element, not just the window: the detail and collection pages scroll inside
// inner `overflow-y-auto` containers, whose `scroll` events don't bubble to
// `window`. Capture catches them regardless of input method (wheel, touch,
// scrollbar, keyboard), and `e.target` tells us which element actually scrolled.
export const useOnScroll = ({
  scrollThreshold = 50,
  debounceTime = 100,
  throttleTime = 100,
}: UseOnScrollParams = {}): ScrollState => {
  const [scrollState, setScrollState] = useState<ScrollState>({
    trigger: false,
    scrollY: 0,
    scrollDirection: null,
  })

  const lastScrollY = useRef(0)
  // The element whose scroll we're currently tracking. When it changes (e.g.
  // navigating to another page, or switching between the sidebar and the main
  // column), we re-baseline instead of computing a bogus delta across elements.
  const lastTarget = useRef<EventTarget | null>(null)
  const pendingTarget = useRef<EventTarget | null>(null)
  // Mirror of `trigger` readable synchronously, plus a timestamp until which we
  // suppress further toggles. Toggling the header animates a layout that resizes
  // inner scroll containers; that resize clamps scrollTop and fires scroll events
  // which would otherwise flip the trigger straight back — a hide/show flicker.
  const triggerRef = useRef(false)
  const settleUntil = useRef(0)
  const throttleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScroll = useCallback(() => {
    const target = pendingTarget.current
    if (!target) return

    // Viewport scrolling targets the document; inner containers target the element.
    const isViewport =
      target === document ||
      target === document.documentElement ||
      target === document.body
    const currentScrollY = isViewport ? window.scrollY : (target as HTMLElement).scrollTop

    // Switched to a different scroll container — re-baseline, don't trigger.
    if (target !== lastTarget.current) {
      lastTarget.current = target
      lastScrollY.current = currentScrollY
      return
    }

    const direction = currentScrollY > lastScrollY.current ? "down" : "up"
    const scrollDifference = Math.abs(currentScrollY - lastScrollY.current)

    // Ignore sub-5px movement so trackpad jitter doesn't toggle the trigger.
    if (scrollDifference < 5) return
    lastScrollY.current = currentScrollY

    // Within the settle window after a toggle, keep tracking position but don't
    // re-evaluate the trigger — this is where the resize-induced scroll lands.
    if (Date.now() < settleUntil.current) return

    const nextTrigger = direction === "down"
      ? (currentScrollY > scrollThreshold || triggerRef.current)
      : false
    if (nextTrigger !== triggerRef.current) {
      triggerRef.current = nextTrigger
      settleUntil.current = Date.now() + SETTLE_MS
    }
    setScrollState({ trigger: nextTrigger, scrollY: currentScrollY, scrollDirection: direction })
  }, [scrollThreshold])

  const throttledScrollHandler = useCallback(() => {
    if (!throttleTimeout.current) {
      throttleTimeout.current = setTimeout(() => {
        handleScroll()
        throttleTimeout.current = null
      }, throttleTime)
    }
  }, [handleScroll, throttleTime])

  const debouncedScrollHandler = useCallback(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    debounceTimeout.current = setTimeout(() => {
      handleScroll()
      debounceTimeout.current = null
    }, debounceTime)
  }, [handleScroll, debounceTime])

  // Throttle keeps state flowing during continuous scroll; debounce
  // guarantees a final update once the user stops.
  const combinedScrollHandler = useCallback((e: Event) => {
    // While an overlay is open (dialog / search drawer), ignore scroll entirely:
    // the drawer's own `overflow-y-auto` body emits capture-phase scroll events
    // that would otherwise read as page scrolling and flip the auto-hide header,
    // resizing the layout behind the backdrop. The next real page scroll after
    // the overlay closes re-baselines via the target-changed check below.
    if (isScrollLocked()) return
    pendingTarget.current = e.target
    throttledScrollHandler()
    debouncedScrollHandler()
  }, [throttledScrollHandler, debouncedScrollHandler])

  useEffect(() => {
    document.addEventListener("scroll", combinedScrollHandler, true)
    return () => {
      document.removeEventListener("scroll", combinedScrollHandler, true)
      if (throttleTimeout.current) clearTimeout(throttleTimeout.current)
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    }
  }, [combinedScrollHandler])

  return scrollState
}
