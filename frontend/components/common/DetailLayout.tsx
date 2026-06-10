/** Shared shell for entity detail pages: a scrolling info sidebar next to the
 *  scrolling main column, plus the standard loading / error screen. */

import { cn } from "@/lib/utils"
import { Loading } from "@/components/status/Loading"
import { ErrorPanel } from "@/components/status/ErrorPanel"

/** Full-page loading / not-found screen, shown while a detail entity resolves. */
export function DetailStatus({ loading, error }: { loading: boolean; error: string | null }) {
  return (
    <main className="container mx-auto flex-1 flex items-center justify-center p-4">
      {loading ? <Loading message="Loading..." /> : <ErrorPanel message={error ?? "Not found"} />}
    </main>
  )
}

interface DetailLayoutProps {
  /** Sidebar content (content-level selectors + info panel). */
  aside: React.ReactNode
  /** Sidebar content for the mobile layout, rendered inline above `children`. */
  mobileAside?: React.ReactNode
  /** `lg` = wide sidebar (VN / Character); `sm` = narrow (Producer / Staff / …). */
  asideWidth?: "sm" | "lg"
  children: React.ReactNode
}

export function DetailLayout({
  aside, mobileAside, asideWidth = "sm", children,
}: DetailLayoutProps) {
  return (
    // At lg+ the page is a two-column shell whose columns scroll independently
    // inside a viewport-height box. Below lg it collapses to one column, so we
    // drop the fixed height / inner scroll and let the whole page scroll
    // normally — which also lets the global header auto-hide on scroll.
    <div className="container mx-auto flex gap-6 px-4 lg:h-[calc(100vh_-_var(--header-h,4rem))] lg:overflow-hidden">
      {/* The layout mounts only once the entity has resolved, so this is a
          one-shot entrance for the whole page (matches the grids' fade-in). */}
      <aside
        className={cn(
          "hidden lg:flex flex-col gap-3 shrink-0 overflow-y-auto overscroll-contain py-4 pr-1",
          "animate-slide-up-fade",
          asideWidth === "lg" ? "w-64 xl:w-72" : "w-56 xl:w-64",
        )}
      >
        {aside}
      </aside>

      <div className="flex-1 min-w-0 lg:overflow-y-auto lg:overscroll-contain py-4 pb-12 animate-slide-up-fade">
        {mobileAside && (
          <div className="lg:hidden flex flex-col gap-3 mb-6">{mobileAside}</div>
        )}
        {children}
      </div>
    </div>
  )
}
