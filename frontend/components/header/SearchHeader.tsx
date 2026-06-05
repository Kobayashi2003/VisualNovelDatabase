/** Header search field with refresh / original-names toggle / advanced options panel. */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Languages, RefreshCw, SlidersHorizontal } from "lucide-react"
import { useSearchContext } from "@/context/SearchContext"
import { SearchBar } from "@/components/input/SearchBar"
import { SubmitButton } from "@/components/button/SubmitButton"
import { IconButton } from "@/components/button/IconButton"
import { SearchPanel } from "@/components/panel/SearchPanel"
import { FilterState, buildInitialState } from "@/lib/config"

interface SearchHeaderProps {
  hidden?: boolean
  className?: string
}

export function SearchHeader({ hidden = false, className }: SearchHeaderProps) {
  const { searchFrom, searchType, sortBy, showOriginal, setSearchFrom, setSearchType, setSortBy, setShowOriginal } = useSearchContext()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [sortOrder, setSortOrder] = useState("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [filtersParams, setFiltersParams] = useState<Record<string, string>>({})
  // The full panel state behind `filtersParams`, kept so reopening the panel shows
  // the filters actually in effect instead of a blank form (which would mislead the
  // user into thinking the next search carries no filters when it still does).
  const [filtersState, setFiltersState] = useState<FilterState>(() => buildInitialState(searchType))
  // The selected collection scope (category id / sentinel) behind the `id`
  // filter in `filtersParams`, kept so reopening the panel shows the active
  // scope. Like filters, it's per-type and guarded by `filtersType`.
  const [collection, setCollection] = useState<string>("")
  // `filtersType` tracks which entity type the stored `filtersParams` belongs to,
  // so filters from a previous search don't leak into a query for a different type.
  const [filtersType, setFiltersType] = useState<string>(searchType)
  const [panelOpen, setPanelOpen] = useState(false)

  // Accepts overrides so the panel's onApply can pass the freshly-edited values
  // directly, avoiding the React batch that would otherwise delay setState.
  const handleSubmit = (
    e?: React.FormEvent,
    overrides?: { from?: string; type?: string; sortByVal?: string; order?: string; filters?: Record<string, string> },
  ) => {
    if (e) e.preventDefault()
    const from = overrides?.from ?? searchFrom
    const type = overrides?.type ?? searchType
    const sort = overrides?.sortByVal ?? sortBy
    const order = overrides?.order ?? sortOrder
    const filters = overrides?.filters ?? (filtersType === type ? filtersParams : {})

    setLoading(true)
    const params = new URLSearchParams(filters)
    if (from === "local") params.set("from", "local")
    if (from === "remote") params.set("from", "remote")
    if (searchQuery) params.set("search", searchQuery)
    if (sort) params.set("sort", sort)
    params.set("reverse", order === "desc" ? "True" : "False")
    router.push(`/${type}?${params.toString()}`)
    setLoading(false)
  }

  const handlePanelApply = (from: string, type: string, sort: string, order: string, filters: Record<string, string>, state: FilterState, coll: string) => {
    setSearchFrom(from)
    setSearchType(type)
    setSortBy(sort)
    setSortOrder(order)
    setFiltersParams(filters)
    setFiltersState(state)
    setCollection(coll)
    setFiltersType(type)
    handleSubmit(undefined, { from, type, sortByVal: sort, order, filters })
  }

  const handlePanelSave = (from: string, type: string, sort: string, order: string, filters: Record<string, string>, state: FilterState, coll: string) => {
    setSearchFrom(from)
    setSearchType(type)
    setSortBy(sort)
    setSortOrder(order)
    setFiltersParams(filters)
    setFiltersState(state)
    setCollection(coll)
    setFiltersType(type)
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className={cn("flex flex-row items-center gap-1", className)}>
      <IconButton
        icon={<RefreshCw className="w-4 h-4" />}
        onClick={() => router.refresh()}
        disabled={hidden}
        tooltip="Refresh"
      />

      <button
        onClick={() => setShowOriginal(!showOriginal)}
        disabled={hidden}
        className={cn(
          "p-2 rounded-full transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          showOriginal
            ? "text-accent bg-accent/10 hover:bg-accent/20"
            : "text-muted hover:text-white hover:bg-white/10"
        )}
        title={showOriginal ? "Showing original names" : "Show original names"}
        aria-label="Toggle original names"
      >
        <Languages className="w-4 h-4" />
      </button>

      <form onSubmit={handleSubmit} className="flex-1 min-w-0 lg:flex-none lg:w-56 xl:w-72">
        <SearchBar
          input={searchQuery}
          setInput={setSearchQuery}
          placeholder="Search..."
          disabled={loading || hidden}
        />
      </form>

      <SubmitButton handleSubmit={handleSubmit} disabled={loading || hidden} />

      <IconButton
        icon={<SlidersHorizontal className="w-4 h-4" />}
        onClick={() => setPanelOpen(true)}
        disabled={loading || hidden}
        ariaLabel="Search options"
      />

      <SearchPanel
        open={panelOpen}
        setOpen={setPanelOpen}
        initialFrom={searchFrom}
        initialType={searchType}
        initialSortBy={sortBy}
        initialOrder={sortOrder}
        initialFilterState={filtersType === searchType ? filtersState : buildInitialState(searchType)}
        initialCollection={filtersType === searchType ? collection : ""}
        onApply={handlePanelApply}
        onSave={handlePanelSave}
      />
    </div>
  )
}
