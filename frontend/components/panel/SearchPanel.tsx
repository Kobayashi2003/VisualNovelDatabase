/** Right-side drawer for advanced search: source / type / sort / order / filters. */
"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { useScrollLock } from "@/hooks/useScrollLock"
import { useUserContext } from "@/context/UserContext"
import { api } from "@/lib/api"
import { ROUTE_TO_TYPE } from "@/lib/constants"
import type { Category } from "@/lib/types"
import { X, ChevronDown, SlidersHorizontal } from "lucide-react"
import {
  FilterState,
  buildInitialState,
  buildFilterParams,
  getSortOptions,
  getDefaultSortOption,
} from "@/lib/config"
import { FiltersForm } from "@/components/dialog/FiltersForm"


/* ─── Constants & helpers ──────────────────────────────────────────────────── */

// Sentinels for the collection-scope picker. "" → no restriction (search the
// whole catalogue); "all" → the union of every collection of the active type.
const COLLECTION_NONE = ""
const COLLECTION_ALL = "all"

// Translate the chosen collection scope into a VNDB `id` filter (e.g.
// "v17,v22"). Returns null when no scope is active. An *active but empty* scope
// yields a sentinel id ("v0") that matches nothing, so searching an empty
// collection honestly returns no results instead of silently falling back to
// the whole catalogue.
function collectionIdFilter(
  collection: string,
  routeType: string,
  categories: Category[],
): string | null {
  if (!collection) return null
  let markIds: number[]
  if (collection === COLLECTION_ALL) {
    const seen = new Set<number>()
    for (const cat of categories) for (const m of cat.marks) seen.add(m.id)
    markIds = Array.from(seen)
  } else {
    const cat = categories.find(c => String(c.id) === collection)
    markIds = cat ? cat.marks.map(m => m.id) : []
  }
  if (markIds.length === 0) return `${routeType}0`
  return markIds.map(id => `${routeType}${id}`).join(",")
}

const FROM_OPTIONS = [
  { value: "both", label: "Both" },
  { value: "remote", label: "Remote" },
  { value: "local", label: "Local" },
]

const TYPE_OPTIONS = [
  { value: "v", label: "Visual Novel" },
  { value: "r", label: "Release" },
  { value: "c", label: "Character" },
  { value: "p", label: "Producer" },
  { value: "s", label: "Staff" },
  { value: "g", label: "Tag" },
  { value: "i", label: "Trait" },
]

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">
      {children}
    </p>
  )
}

/* ─── Search drawer ────────────────────────────────────────────────────────── */

interface SearchPanelProps {
  open: boolean
  setOpen: (open: boolean) => void
  initialFrom: string
  initialType: string
  initialSortBy: string
  initialOrder: string
  initialFilterState: FilterState
  initialCollection: string
  onApply: (from: string, type: string, sortBy: string, order: string, filterParams: Record<string, string>, filterState: FilterState, collection: string) => void
  onSave?: (from: string, type: string, sortBy: string, order: string, filterParams: Record<string, string>, filterState: FilterState, collection: string) => void
}

export function SearchPanel({
  open, setOpen,
  initialFrom,
  initialType, initialSortBy, initialOrder, initialFilterState, initialCollection,
  onApply, onSave,
}: SearchPanelProps) {
  const { user } = useUserContext()
  const [mounted, setMounted] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [localFrom, setLocalFromRaw] = useState(initialFrom)
  const [localType, setLocalTypeRaw] = useState(initialType)
  const [localSortBy, setLocalSortBy] = useState(initialSortBy)
  const [localOrder, setLocalOrder] = useState(initialOrder)
  const [localFilterState, setLocalFilterState] = useState<FilterState>(initialFilterState)
  // Restrict the search to one of the signed-in user's collections (or all of
  // them). Held here as the selected category id / sentinel; converted to an
  // `id` filter only at apply time.
  const [localCollection, setLocalCollection] = useState(initialCollection)
  const [categories, setCategories] = useState<Category[]>([])

  /* ── Effects ───────────────────────────────────────────────────────────── */

  useEffect(() => { setMounted(true) }, [])

  // Load the user's collections for the active type while the drawer is open, so
  // the scope picker reflects exactly what can be searched. Cleared when signed
  // out. Re-runs on type change because collections are per entity type.
  useEffect(() => {
    if (!open || !user) { setCategories([]); return }
    let cancelled = false
    api.category.get(ROUTE_TO_TYPE[localType] ?? localType)
      .then(data => { if (!cancelled) setCategories(data) })
      .catch(() => { if (!cancelled) setCategories([]) })
    return () => { cancelled = true }
  }, [open, user, localType])

  // Keep the page behind the drawer from scrolling — a wheel over the drawer
  // (or past the end of its scrollable body) must not chain through to the page.
  useScrollLock(open, bodyRef)

  // Re-seed staged state from the live values every time the drawer opens, so
  // closing without applying is a true cancel.
  useEffect(() => {
    if (!open) return
    setLocalFromRaw(initialFrom)
    setLocalTypeRaw(initialType)
    setLocalSortBy(initialSortBy)
    setLocalOrder(initialOrder)
    setLocalFilterState(initialFilterState)
    setLocalCollection(initialCollection)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, setOpen])

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  // Source change → sort list depends on source, so reset to its default.
  const setLocalFrom = (f: string) => {
    setLocalFromRaw(f)
    setLocalSortBy(getDefaultSortOption(localType, f))
  }

  // Type change → reset sort + clear filters and collection scope (both are
  // per-type; the collection list is re-fetched by the effect above).
  const setLocalType = (t: string) => {
    setLocalTypeRaw(t)
    setLocalSortBy(getDefaultSortOption(t, localFrom))
    setLocalFilterState(buildInitialState(t))
    setLocalCollection(COLLECTION_NONE)
  }

  const sortOptions = getSortOptions(localType, localFrom)

  // Merge the collection-scope `id` filter into the params the form produced.
  const buildParams = () => {
    const filterParams = buildFilterParams(localType, localFilterState, localFrom)
    const idFilter = user ? collectionIdFilter(localCollection, localType, categories) : null
    if (idFilter) filterParams.id = idFilter
    return filterParams
  }

  const handleApply = () => {
    onApply(localFrom, localType, localSortBy, localOrder, buildParams(), localFilterState, localCollection)
    setOpen(false)
  }

  const handleApplyOnly = () => {
    onSave?.(localFrom, localType, localSortBy, localOrder, buildParams(), localFilterState, localCollection)
    setOpen(false)
  }

  const handleClearFilters = () => {
    setLocalFilterState(buildInitialState(localType))
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-80 sm:w-96",
          "flex flex-col",
          // Shared elevated-overlay translucency standard (see --elevated /
          // --elevated-hover in globals.css). `bg-[var(--elevated)]` rather than
          // `bg-elevated` so the global `.bg-elevated` transition rule doesn't
          // override this drawer's combined transform+colour transition below.
          "bg-[var(--elevated)] hover:bg-[var(--elevated-hover)] border-l border-white/10",
          "shadow-2xl shadow-black/60",
          "transition-[transform,background-color] duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h2 className="text-base font-bold text-white">Search Options</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-full text-muted hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-6">

          {/* Source */}
          <div>
            <SectionHeading>Source</SectionHeading>
            <div className="flex rounded-full border border-white/10 overflow-hidden">
              {FROM_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLocalFrom(opt.value)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold text-center transition-all duration-150",
                    localFrom === opt.value
                      ? "bg-white/15 text-white"
                      : "text-muted hover:text-white hover:bg-white/10"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <SectionHeading>Type</SectionHeading>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLocalType(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150",
                    localType === opt.value
                      ? "bg-accent text-white"
                      : "bg-white/5 text-muted hover:text-white hover:bg-white/10 border border-white/10"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort + Order — two equal-width dropdowns on one row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <SectionHeading>Sort By</SectionHeading>
              <div className="relative">
                <select
                  value={localSortBy}
                  onChange={e => setLocalSortBy(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 cursor-pointer"
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              </div>
            </div>

            <div className="min-w-0">
              <SectionHeading>Order</SectionHeading>
              <div className="relative">
                <select
                  value={localOrder}
                  onChange={e => setLocalOrder(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 cursor-pointer"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              </div>
            </div>
          </div>

          {/* Collections — signed-in only. Limits the search to the entities
              the user has marked, by injecting an `id` filter at apply time. */}
          {user && (
            <div>
              <SectionHeading>Collections</SectionHeading>
              <div className="relative">
                <select
                  value={localCollection}
                  onChange={e => setLocalCollection(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 cursor-pointer"
                >
                  <option value={COLLECTION_NONE}>All site</option>
                  <option value={COLLECTION_ALL}>All collections</option>
                  {categories.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.category_name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              </div>
            </div>
          )}

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionHeading>Filters</SectionHeading>
              <button
                onClick={handleClearFilters}
                className="text-xs text-muted hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <FiltersForm
              type={localType}
              filterState={localFilterState}
              setFilterState={setLocalFilterState}
              source={localFrom}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-white/10 flex gap-2">
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-full text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all"
          >
            Search
          </button>
          <button
            onClick={handleApplyOnly}
            className="flex-1 py-2.5 rounded-full text-sm font-bold text-white/80 bg-white/10 hover:bg-white/20 transition-all"
          >
            Apply
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
