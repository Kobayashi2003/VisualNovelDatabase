/** Layout for the main app: background, header, and global context providers. */
"use client"

import { useRef, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useOnScroll } from "@/hooks/useOnScroll"
import { useScrollLocked } from "@/hooks/useScrollLock"
import { UserProvider } from "@/context/UserContext"
import { SearchProvider } from "@/context/SearchContext"
import { IMGSERVE_BASE_URL } from "@/lib/constants"
import { HeaderBar } from "@/components/header/HeaderBar"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  // Defer the (large) page background so content images win the network first;
  // it's fetched once the browser goes idle, after the initial render.
  const [bgUrl, setBgUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    const url = `url(${IMGSERVE_BASE_URL}/bg)`
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setBgUrl(url))
      return () => w.cancelIdleCallback?.(id)
    }
    const t = setTimeout(() => setBgUrl(url), 200)
    return () => clearTimeout(t)
  }, [])

  // The Kobayashi showcase hides the global search header and supplies its own
  // pin-to-top toolbar instead, so it starts flush against the viewport top.
  const pathname = usePathname()
  const hideHeader = pathname === "/kobayashi"

  // Drives the auto-hide header when the user scrolls down.
  const { trigger } = useOnScroll({ scrollThreshold: 30, throttleTime: 150, debounceTime: 200 })

  const [mounted, setMounted] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  // Reveal the auto-hidden header when the pointer reaches the top edge.
  // Cases where it must NOT fire:
  //   - header already shown (`!trigger`) → `headerHidden` below is a no-op;
  //   - an overlay is open (dialog / search drawer) → the header sits behind it
  //     at a lower z-index, so a peek would be invisible noise (`overlayOpen`);
  //   - touch input → there's no pointer, so `mousemove` simply never fires.
  const overlayOpen = useScrollLocked()
  const [pointerAtTop, setPointerAtTop] = useState(false)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Track the live header height (it wraps to two rows on narrow widths) so
      // moving onto the lower search row doesn't fall out of the zone and dismiss it.
      const zone = (headerRef.current?.offsetHeight || 64) + 8
      // Only the middle horizontal third reveals the header, so brushing the top
      // corners (e.g. reaching for window controls) doesn't pop it open.
      const w = window.innerWidth
      const inMiddleThird = e.clientX >= w / 3 && e.clientX <= (w * 2) / 3
      const atTop = e.clientY <= zone && inMiddleThird
      setPointerAtTop(prev => (prev === atTop ? prev : atTop))
    }
    const onLeave = () => setPointerAtTop(false)
    window.addEventListener("mousemove", onMove)
    document.documentElement.addEventListener("mouseleave", onLeave)
    return () => {
      window.removeEventListener("mousemove", onMove)
      document.documentElement.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  // Hidden only when scrolled down AND not being peeked at the top edge. The
  // spacer / `--header-h` stay tied to `trigger`, so a peek overlays content
  // instead of reflowing it.
  const headerHidden = trigger && !(pointerAtTop && !overlayOpen)

  // Measure the header so the spacer below can reserve its exact height —
  // ResizeObserver keeps the spacer in sync if the header reflows. Re-runs when
  // `hideHeader` toggles: the header is unmounted on the Kobayashi page, so this
  // must re-measure (and re-observe) the moment it re-appears on another route —
  // otherwise the height stays stale at 0 and the fixed header overlaps content.
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    setHeaderHeight(header.offsetHeight)
    const observer = new ResizeObserver(entries => {
      setHeaderHeight(entries[0].target.clientHeight)
    })
    observer.observe(header)
    return () => observer.disconnect()
  }, [hideHeader])

  // `mounted` gates the header/spacer until the client has hydrated, so the
  // SSR markup doesn't show a header that disappears on the first scroll tick.
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return (
    <SearchProvider>
      <UserProvider>
        <div
          style={{
            backgroundImage: bgUrl,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
            // Collapses to 0 while the header is hidden so inner-scrolling pages
            // (which size themselves to `calc(100vh - var(--header-h))`) reclaim
            // the reserved strip. Registered with `@property` so the change animates.
            "--header-h": hideHeader || trigger ? "0px" : `${headerHeight}px`,
          } as React.CSSProperties}
        >
          <div className="min-h-screen overflow-x-clip bg-background/80 text-white flex flex-col">
            {!hideHeader && (
              <>
                <div
                  ref={headerRef}
                  className={cn(
                    "fixed top-0 left-0 right-0 z-10",
                    "bg-background/90 backdrop-blur-sm",
                    "transition-opacity duration-300",
                    headerHidden ? "opacity-0 -z-10" : "opacity-100",
                    !mounted && "hidden"
                  )}
                >
                  <HeaderBar hidden={headerHidden} />
                </div>
                <div
                  style={{ height: trigger ? 0 : `${headerHeight}px` }}
                  className={cn("transition-[height] duration-300 ease-out", !mounted && "hidden")}
                />
              </>
            )}
            <div className="flex-1 flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </UserProvider>
    </SearchProvider>
  )
}
