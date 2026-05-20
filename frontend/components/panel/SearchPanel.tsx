/** Right-side drawer for advanced search: source / type / sort / order / filters. */
"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X, ArrowUp, ArrowDown, SlidersHorizontal } from "lucide-react"
import {
  FilterState,
  buildInitialState,
  buildFilterParams,
  getSortOptions,
  getDefaultSortOption,
} from "@/lib/config"
import { FiltersForm } from "@/components/dialog/FiltersForm"

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

interface SearchPanelProps {
  open: boolean
  setOpen: (open: boolean) => void
  initialFrom: string
  initialType: string
  initialSortBy: string
  initialOrder: string
  onApply: (from: string, type: string, sortBy: string, order: string, filterParams: Record<string, string>) => void
  onSave?: (from: string, type: string, sortBy: string, order: string, filterParams: Record<string, string>) => void
}

export function SearchPanel({
  open, setOpen,
  initialFrom,
  initialType, initialSortBy, initialOrder,
  onApply, onSave,
}: SearchPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [localFrom, setLocalFromRaw] = useState(initialFrom)
  const [localType, setLocalTypeRaw] = useState(initialType)
  const [localSortBy, setLocalSortBy] = useState(initialSortBy)
  const [localOrder, setLocalOrder] = useState(initialOrder)
  const [localFilterState, setLocalFilterState] = useState<FilterState>(() => buildInitialState(initialType))

  useEffect(() => { setMounted(true) }, [])

  // Re-seed staged state from the live values every time the drawer opens, so
  // closing without applying is a true cancel.
  useEffect(() => {
    if (!open) return
    setLocalFromRaw(initialFrom)
    setLocalTypeRaw(initialType)
    setLocalSortBy(initialSortBy)
    setLocalOrder(initialOrder)
    setLocalFilterState(buildInitialState(initialType))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, setOpen])

  // Source change → sort list depends on source, so reset to its default.
  const setLocalFrom = (f: string) => {
    setLocalFromRaw(f)
    setLocalSortBy(getDefaultSortOption(localType, f))
  }

  // Type change → reset sort + clear filters (filters are per-type).
  const setLocalType = (t: string) => {
    setLocalTypeRaw(t)
    setLocalSortBy(getDefaultSortOption(t, localFrom))
    setLocalFilterState(buildInitialState(t))
  }

  const sortOptions = getSortOptions(localType, localFrom)

  const handleApply = () => {
    const filterParams = buildFilterParams(localType, localFilterState)
    onApply(localFrom, localType, localSortBy, localOrder, filterParams)
    setOpen(false)
  }

  const handleApplyOnly = () => {
    const filterParams = buildFilterParams(localType, localFilterState)
    onSave?.(localFrom, localType, localSortBy, localOrder, filterParams)
    setOpen(false)
  }

  const handleClearFilters = () => {
    setLocalFilterState(buildInitialState(localType))
  }

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
          "bg-elevated border-l border-white/10",
          "shadow-2xl shadow-black/60",
          "transition-transform duration-200 ease-out",
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
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">

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

          {/* Sort */}
          <div>
            <SectionHeading>Sort By</SectionHeading>
            <div className="grid grid-cols-2 gap-1">
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLocalSortBy(opt.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm text-left transition-all duration-150",
                    localSortBy === opt.value
                      ? "bg-accent/20 text-accent font-semibold border border-accent/40"
                      : "text-muted hover:text-white hover:bg-white/10 border border-transparent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Order */}
          <div>
            <SectionHeading>Order</SectionHeading>
            <div className="flex rounded-full border border-white/10 overflow-hidden">
              <button
                onClick={() => setLocalOrder("asc")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all duration-150",
                  localOrder === "asc"
                    ? "bg-white/15 text-white"
                    : "text-muted hover:text-white hover:bg-white/10"
                )}
              >
                <ArrowUp className="w-3 h-3" />
                Ascending
              </button>
              <button
                onClick={() => setLocalOrder("desc")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all duration-150",
                  localOrder === "desc"
                    ? "bg-white/15 text-white"
                    : "text-muted hover:text-white hover:bg-white/10"
                )}
              >
                <ArrowDown className="w-3 h-3" />
                Descending
              </button>
            </div>
          </div>

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
