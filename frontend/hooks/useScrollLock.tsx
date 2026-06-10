/** Locks background scrolling while a modal/overlay is open. */
"use client"

import { useEffect, useSyncExternalStore } from "react"

// Process-wide count of active scroll locks, i.e. how many overlays (dialogs,
// the search drawer, …) are currently open. Exposed via `useScrollLocked` so
// unrelated UI — like the header's hover-to-reveal — can tell when a modal is up
// and bow out.
let lockCount = 0
const lockListeners = new Set<() => void>()
const emitLockChange = () => lockListeners.forEach(l => l())

/** Non-reactive read of the lock state, for use inside event handlers. */
export function isScrollLocked(): boolean {
  return lockCount > 0
}

/** Reactive `true` while any `useScrollLock(true, …)` is mounted. */
export function useScrollLocked(): boolean {
  return useSyncExternalStore(
    cb => { lockListeners.add(cb); return () => lockListeners.delete(cb) },
    () => lockCount > 0,
    () => false,
  )
}

// Walk up from the event target to `boundary` (inclusive) and return the nearest
// element that can actually scroll vertically — a drawer body, sidebar list, or a
// nested scroller like the entity-picker dropdown. `null` means nothing in range
// scrolls, so a wheel/touch here would otherwise chain through to the page.
export function findVerticalScroller(
  target: EventTarget | null,
  boundary: HTMLElement,
): HTMLElement | null {
  let node = target instanceof HTMLElement ? target
    : target instanceof Node ? target.parentElement : null
  while (node && node !== boundary.parentElement) {
    if (node.scrollHeight > node.clientHeight) {
      const overflowY = getComputedStyle(node).overflowY
      if (overflowY === "auto" || overflowY === "scroll") return node
    }
    node = node.parentElement
  }
  return null
}

// Keeps wheel/touch scrolling contained within `ref` without locking the rest of
// the page. For a persistent panel (e.g. the collections sidebar) whose pinned
// regions aren't scroll containers, CSS `overscroll-behavior: contain` can't help
// — it only engages on an element that actually has overflow to scroll. So we
// cancel any wheel/touch that wouldn't move a scroller inside the panel, which
// stops it from chaining out to the window. Scrolling an inner list still works,
// but once it hits its top/bottom edge the wheel stops there.
export function useContainScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      const scroller = findVerticalScroller(e.target, el)
      if (!scroller) { e.preventDefault(); return }
      const atTop = scroller.scrollTop <= 0 && e.deltaY < 0
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 && e.deltaY > 0
      if (atTop || atBottom) e.preventDefault()
    }
    // Touch lacks a usable per-event delta, so block unless something under the
    // finger has room to scroll at all.
    const onTouchMove = (e: TouchEvent) => {
      if (!findVerticalScroller(e.target, el)) e.preventDefault()
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("touchmove", onTouchMove)
    }
  }, [ref])
}

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

    lockCount++
    emitLockChange()

    const onWheel = (e: WheelEvent) => {
      const root = allowRef?.current
      // Anything outside the allowed area (or no allowed area at all) is locked.
      if (!root || !(e.target instanceof Node) || !root.contains(e.target)) {
        e.preventDefault()
        return
      }
      // Inside the drawer: let the active scroller move, but stop the wheel from
      // chaining to the page once it has hit the top/bottom edge in that direction.
      const scroller = findVerticalScroller(e.target, root)
      if (!scroller) { e.preventDefault(); return }
      const atTop = scroller.scrollTop <= 0 && e.deltaY < 0
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 && e.deltaY > 0
      if (atTop || atBottom) e.preventDefault()
    }
    const onTouchMove = (e: TouchEvent) => {
      const root = allowRef?.current
      // Touch lacks a usable delta here, so block unless the touched area itself
      // (or a nested scroller within it) has room to scroll.
      if (!root || !(e.target instanceof Node) || !root.contains(e.target)
          || !findVerticalScroller(e.target, root)) {
        e.preventDefault()
      }
    }

    document.addEventListener("wheel", onWheel, { passive: false, capture: true })
    document.addEventListener("touchmove", onTouchMove, { passive: false, capture: true })
    return () => {
      lockCount--
      emitLockChange()
      document.removeEventListener("wheel", onWheel, true)
      document.removeEventListener("touchmove", onTouchMove, true)
    }
  }, [locked, allowRef])
}
