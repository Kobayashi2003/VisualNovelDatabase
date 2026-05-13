"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Languages, RefreshCw, SlidersHorizontal } from "lucide-react"
import { useSearchContext } from "@/context/SearchContext"
import { SearchBar } from "@/components/input/SearchBar"
import { SubmitButton } from "@/components/button/SubmitButton"
import { SearchPanel } from "@/components/panel/SearchPanel"

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
  const [filtersType, setFiltersType] = useState<string>(searchType) // tracks which type filtersParams belongs to
  const [panelOpen, setPanelOpen] = useState(false)

  // Accept optional overrides to avoid async state issues when applying from panel
  const handleSubmit = (
    e?: React.FormEvent,
    overrides?: { from?: string; type?: string; sortByVal?: string; order?: string; filters?: Record<string, string> }
  ) => {
    if (e) e.preventDefault()
    const from = overrides?.from ?? searchFrom
    const type = overrides?.type ?? searchType
    const sort = overrides?.sortByVal ?? sortBy
    const order = overrides?.order ?? sortOrder
    // Only use stored filters if they belong to the current type; otherwise discard them
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

  const handlePanelApply = (from: string, type: string, sort: string, order: string, filters: Record<string, string>) => {
    setSearchFrom(from)
    setSearchType(type)
    setSortBy(sort)
    setSortOrder(order)
    setFiltersParams(filters)
    setFiltersType(type)
    handleSubmit(undefined, { from, type, sortByVal: sort, order, filters })
  }

  const handlePanelSave = (from: string, type: string, sort: string, order: string, filters: Record<string, string>) => {
    setSearchFrom(from)
    setSearchType(type)
    setSortBy(sort)
    setSortOrder(order)
    setFiltersParams(filters)
    setFiltersType(type)
  }

  return (
    <div className={cn("flex flex-row items-center gap-1", className)}>
      <button
        onClick={() => router.refresh()}
        disabled={hidden}
        className={cn(
          "p-2 rounded-full transition-all duration-200",
          "text-muted hover:text-white hover:bg-white/10",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
        title="Refresh"
        aria-label="Refresh"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

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

      <button
        onClick={() => setPanelOpen(true)}
        disabled={loading || hidden}
        className={cn(
          "p-2 rounded-full",
          "text-muted hover:text-white",
          "hover:bg-white/10",
          "transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
        aria-label="Search options"
      >
        <SlidersHorizontal className="w-4 h-4" />
      </button>

      <SearchPanel
        open={panelOpen}
        setOpen={setPanelOpen}
        initialFrom={searchFrom}
        initialType={searchType}
        initialSortBy={sortBy}
        initialOrder={sortOrder}
        initialFilters={filtersParams}
        onApply={handlePanelApply}
        onSave={handlePanelSave}
      />
    </div>
  )
}
