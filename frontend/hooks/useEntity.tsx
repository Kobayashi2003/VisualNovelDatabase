/** Hook that fetches a single entity by id, with abort-on-change and
 *  loading / error state. Shared by every entity detail page. */
"use client"

import { useEffect, useRef, useState } from "react"
import type { VNDBQueryParams } from "@/lib/types"

/** A by-id fetcher from `lib/api` (`api.by_id.vn`, `api.by_id.character`, …). */
type EntityFetcher<T> = (id: number, params: VNDBQueryParams, signal: AbortSignal) => Promise<T>

interface EntityState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useEntity<T>(id: number, fetcher: EntityFetcher<T>): EntityState<T> {
  const [state, setState] = useState<EntityState<T>>({ data: null, loading: true, error: null })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState({ data: null, loading: true, error: null })

    fetcher(id, {}, ctrl.signal)
      .then(data => { if (!ctrl.signal.aborted) setState({ data, loading: false, error: null }) })
      .catch(e => {
        if (ctrl.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : String(e) })
      })

    return () => ctrl.abort()
  }, [id, fetcher])

  return state
}
