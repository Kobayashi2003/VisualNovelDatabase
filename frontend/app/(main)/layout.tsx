/** Layout for the main app: background, header, and global context providers. */
"use client"

import { useRef, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useOnScroll } from "@/hooks/useOnScroll"
import { UserProvider } from "@/context/UserContext"
import { SearchProvider } from "@/context/SearchContext"
import { IMGSERVE_BASE_URL } from "@/lib/constants"
import { HeaderBar } from "@/components/header/HeaderBar"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const bgUrl = `url(${IMGSERVE_BASE_URL}/bg)`

  // The Kobayashi showcase hides the global search header and supplies its own
  // pin-to-top toolbar instead, so it starts flush against the viewport top.
  const pathname = usePathname()
  const hideHeader = pathname === "/kobayashi"

  // Drives the auto-hide header when the user scrolls down.
  const { trigger } = useOnScroll({ scrollThreshold: 30, throttleTime: 150, debounceTime: 200 })

  const [mounted, setMounted] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

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
            "--header-h": hideHeader ? "0px" : `${headerHeight}px`,
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
                    trigger ? "opacity-0 -z-10" : "opacity-100",
                    !mounted && "hidden"
                  )}
                >
                  <HeaderBar hidden={trigger} />
                </div>
                <div style={{ height: `${headerHeight}px` }} className={cn(!mounted && "hidden")} />
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
