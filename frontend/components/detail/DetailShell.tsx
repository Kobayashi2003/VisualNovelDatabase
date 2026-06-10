/** Shared shell for entity detail pages.
 *
 *  The seven detail pages come in three kinds, all built on this shell:
 *   - Media pages (VN, Character): wide sidebar carrying a `DetailCover`
 *     portrait; their info panels have a distinct `inline` arrangement that
 *     puts the cover beside the info card from `sm` up.
 *   - Catalog pages (Staff, Producer, Tag, Trait): narrow sidebar; the body is
 *     a search-backed card grid (`EntityCardSection`), tabbed via
 *     `useDetailTabs` where one entity feeds several queries.
 *   - Release: narrow sidebar holding all linked data; the body (notes /
 *     images) is frequently empty, which triggers the stacked fallback below.
 *
 *  Layout behavior:
 *   - At `lg`+ with a non-empty body: two columns scrolling independently
 *     inside a viewport-height box — `header` tops the main column.
 *   - Below `lg`: one normally-scrolling column ordered header → inlineAside →
 *     body, so the title always leads the page.
 *   - `hasBody={false}` (every body section empty): the stacked order is used
 *     at every width and the sidebar column disappears entirely. */

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

interface DetailShellProps {
  /** Title block (`DetailHeader`) — main column top at `lg`+, page top when stacked. */
  header: React.ReactNode
  /** Sidebar content in its column arrangement (content-level selectors + info panel). */
  aside: React.ReactNode
  /** The same content in its inline arrangement, used by the stacked layout. */
  inlineAside: React.ReactNode
  /** `lg` = wide sidebar (media pages); `sm` = narrow (catalog pages / Release). */
  asideWidth?: "sm" | "lg"
  /** False when every body section is empty — drops the sidebar column and
   *  renders the stacked order at every width. */
  hasBody?: boolean
  children?: React.ReactNode
}

export function DetailShell({
  header, aside, inlineAside, asideWidth = "sm", hasBody = true, children,
}: DetailShellProps) {
  if (!hasBody) {
    return (
      // The shell mounts only once the entity has resolved, so this is a
      // one-shot entrance for the whole page (matches the grids' fade-in).
      <div className="container mx-auto px-4 py-4 pb-12 animate-slide-up-fade">
        <div className="mb-6">{header}</div>
        <div className="flex flex-col gap-3">{inlineAside}</div>
        {children}
      </div>
    )
  }

  return (
    // At lg+ the page is a two-column shell whose columns scroll independently
    // inside a viewport-height box. Below lg it collapses to one column, so we
    // drop the fixed height / inner scroll and let the whole page scroll
    // normally — which also lets the global header auto-hide on scroll.
    <div className="container mx-auto flex gap-6 px-4 lg:h-[calc(100vh_-_var(--header-h,4rem))] lg:overflow-hidden">
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
        <div className="mb-6">{header}</div>
        <div className="lg:hidden flex flex-col gap-3 mb-6">{inlineAside}</div>
        {children}
      </div>
    </div>
  )
}
