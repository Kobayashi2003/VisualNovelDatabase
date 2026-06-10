/** Tab state for catalog detail pages (Staff / Producer) whose body offers
 *  several search-backed grids over one entity. Every tab's result count is
 *  fetched eagerly together so the tab bar is consistent: a tab with a known
 *  count of 0 is hidden; a still-loading tab (count null) stays visible
 *  without a badge. */
"use client"

import { useEffect, useRef, useState } from "react"

export interface DetailTabDef<V extends string> {
  value: V
  label: string
  /** Count query for the tab — typically `limit: 1` against the same filter
   *  the tab's grid uses. Only invoked once `id` is set. */
  fetchCount: () => Promise<{ count: number }>
}

export function useDetailTabs<V extends string>(
  /** The owning entity's id; undefined while it loads (resets counts on change). */
  id: string | undefined,
  defs: DetailTabDef<V>[],
) {
  const [selected, setSelected] = useState<V | undefined>(undefined)
  const [counts, setCounts] = useState<Partial<Record<V, number>>>({})

  // The defs array literal changes identity every render; the count effect
  // keys off the entity id alone and reads the latest defs through a ref,
  // which is synced in its own effect (declared first so it runs first).
  const defsRef = useRef(defs)
  useEffect(() => { defsRef.current = defs })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setCounts({})
    const current = defsRef.current
    Promise.all(current.map(d => d.fetchCount()))
      .then(results => {
        if (cancelled) return
        setCounts(Object.fromEntries(current.map((d, i) => [d.value, results[i].count])) as Partial<Record<V, number>>)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id])

  const tabs = defs
    .filter(d => counts[d.value] == null || counts[d.value]! > 0)
    .map(d => ({ value: d.value, label: d.label, count: counts[d.value] }))

  // Fall back to the first visible tab when none is selected yet or the
  // selected one turned out to be empty.
  const active = tabs.some(t => t.value === selected) ? selected : tabs[0]?.value

  return { tabs, active, setActive: setSelected }
}
