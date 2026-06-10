/** Generic paginated card section for a detail page (a producer's VNs, a tag's
 *  VNs, a staff's voiced characters, …). Handles fetch / loading / error /
 *  empty / pagination; the caller supplies the query and how to render a page. */
"use client"

import { useEffect, useRef, useState } from "react"
import { PAGE_LIMIT } from "@/lib/constants"
import type { VNDBQueryParams, PaginatedResponse } from "@/lib/types"
import { Loading } from "@/components/status/Loading"
import { ErrorPanel } from "@/components/status/ErrorPanel"
import { PaginationButtons } from "@/components/button/PaginationButtons"

interface EntityCardSectionProps<T> {
  /** Query params identifying the relation, e.g. `{ developer: producerId }`. */
  query: VNDBQueryParams
  /** A `size=small` list fetcher from `lib/api` (`api.small.vn`, …). */
  fetcher: (params: VNDBQueryParams, signal?: AbortSignal) => Promise<PaginatedResponse<T>>
  /** Renders one page of results (typically a `CardsGrid`). */
  renderGrid: (items: T[]) => React.ReactNode
  loadingMessage?: string
  emptyMessage?: string
}

export function EntityCardSection<T>({
  query, fetcher, renderGrid,
  loadingMessage = "Loading...", emptyMessage = "Nothing found.",
}: EntityCardSectionProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // Serialised query — a stable dependency that changes only when the relation does.
  const queryKey = JSON.stringify(query)
  const lastQueryKey = useRef(queryKey)

  useEffect(() => {
    // A new relation resets pagination. Done inside the fetch effect (not a
    // separate one) so the stale page is never fetched: bail out here, and the
    // page-1 re-run does the single real fetch.
    if (lastQueryKey.current !== queryKey) {
      lastQueryKey.current = queryKey
      if (page !== 1) { setPage(1); return }
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetcher({ ...query, limit: PAGE_LIMIT, page })
      .then(res => {
        if (cancelled) return
        setItems(res.results)
        setTotalPages(Math.ceil(res.count / PAGE_LIMIT))
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  // `query`/`fetcher` are intentionally tracked via `queryKey`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, page])

  if (loading) return <Loading message={loadingMessage} />
  if (error) return <ErrorPanel message={error} />
  if (items.length === 0) return <p className="text-sm text-muted">{emptyMessage}</p>

  return (
    <div className="flex flex-col gap-4">
      {renderGrid(items)}
      <PaginationButtons totalPages={totalPages} currentPage={page} onPageChange={setPage} />
    </div>
  )
}
