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
  /** Keep the sidebar visible on mobile instead of hiding it (Tag / Trait). */
  asideAlwaysVisible?: boolean
  children: React.ReactNode
}

export function DetailLayout({
  aside, mobileAside, asideWidth = "sm", asideAlwaysVisible, children,
}: DetailLayoutProps) {
  return (
    <div
      className="container mx-auto flex gap-6 px-4 overflow-hidden"
      style={{ height: "calc(100vh - var(--header-h, 4rem))" }}
    >
      <aside
        className={cn(
          "flex-col gap-3 shrink-0 overflow-y-auto py-4 pr-1",
          asideWidth === "lg" ? "w-64 xl:w-72" : "w-56 xl:w-64",
          asideAlwaysVisible ? "flex" : "hidden lg:flex",
        )}
      >
        {aside}
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto py-4 pb-12">
        {!asideAlwaysVisible && mobileAside && (
          <div className="lg:hidden flex flex-col gap-3 mb-6">{mobileAside}</div>
        )}
        {children}
      </div>
    </div>
  )
}
