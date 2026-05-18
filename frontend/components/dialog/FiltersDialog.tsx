/** Modal wrapper around `FiltersForm` with Apply / Clear All actions. */
"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { BaseDialog } from "./BaseDialog"
import { FiltersForm } from "./FiltersForm"
import { FilterState, buildInitialState, buildFilterParams } from "@/lib/config"

interface FiltersDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  type: string
  setFilters: (params: Record<string, string>) => void
  className?: string
}

export function FiltersDialog({ open, setOpen, type, setFilters, className }: FiltersDialogProps) {
  const [state, setState] = useState<FilterState>(() => buildInitialState(type))

  useEffect(() => { setState(buildInitialState(type)) }, [type])

  const handleApply = () => {
    setFilters(buildFilterParams(type, state))
    setOpen(false)
  }

  return (
    <BaseDialog open={open} setOpen={setOpen} title="Search Filters" className={cn("max-w-lg", className)}>
      <form onSubmit={e => { e.preventDefault(); handleApply() }}>
        <div className="overflow-y-auto max-h-[55vh] pr-1">
          <FiltersForm type={type} filterState={state} setFilterState={setState} />
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
          <button type="button" onClick={() => setState(buildInitialState(type))}
            className="flex-1 py-2 rounded-full text-sm font-medium text-muted hover:text-white border border-white/20 hover:border-white/40 transition-all">
            Clear All
          </button>
          <button type="submit"
            className="flex-1 py-2 rounded-full text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all">
            Apply
          </button>
        </div>
      </form>
    </BaseDialog>
  )
}
