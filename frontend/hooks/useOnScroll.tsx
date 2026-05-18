/** Hook that tracks vertical scroll position, direction, and a debounced trigger flag. */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"

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

// `trigger` flips true once the user has scrolled past `scrollThreshold`
// downward, and back to false as soon as they scroll upward at all — the
// "hide on scroll down, show on scroll up" pattern.
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
  const throttleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY
    const direction = currentScrollY > lastScrollY.current ? "down" : "up"
    const scrollDifference = Math.abs(currentScrollY - lastScrollY.current)

    // Ignore sub-5px movement so trackpad jitter doesn't toggle the trigger.
    if (scrollDifference >= 5) {
      setScrollState(prev => ({
        trigger: direction === "down"
          ? (currentScrollY > scrollThreshold || prev.trigger)
          : false,
        scrollY: currentScrollY,
        scrollDirection: direction,
      }))
      lastScrollY.current = currentScrollY
    }
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
  const combinedScrollHandler = useCallback(() => {
    throttledScrollHandler()
    debouncedScrollHandler()
  }, [throttledScrollHandler, debouncedScrollHandler])

  useEffect(() => {
    window.addEventListener("scroll", combinedScrollHandler)
    return () => {
      window.removeEventListener("scroll", combinedScrollHandler)
      if (throttleTimeout.current) clearTimeout(throttleTimeout.current)
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    }
  }, [combinedScrollHandler])

  return scrollState
}
