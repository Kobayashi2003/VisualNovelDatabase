/** Combobox entity-picker: types to search-by-ID (tag, trait, staff, producer).
 *  Search state and the results dropdown come from `entitySearch`; this file
 *  only keeps the flat chip list. */
"use client"

import { X } from "lucide-react"
import type { EntityItem, EntityType } from "@/lib/config"
import { useEntitySearch, EntityResultsDropdown, type NormalizedResult } from "./entitySearch"

interface EntityFilterProps {
  label: string
  entityType: EntityType
  value: EntityItem[]
  source?: string
  onChange: (items: EntityItem[]) => void
}

export function EntityFilter({ label, entityType, value, source, onChange }: EntityFilterProps) {
  const {
    query, results, loading, open,
    containerRef, inputRef,
    handleChange, handleCompositionStart, handleCompositionEnd, handleFocus,
    clearAfterSelect,
  } = useEntitySearch(entityType, source)

  /* Select a result from the dropdown */
  const select = (result: NormalizedResult) => {
    if (value.some(v => v.id === result.id)) return
    onChange([...value, { id: result.id, label: result.name }])
    clearAfterSelect()
  }

  const remove = (id: string) => onChange(value.filter(v => v.id !== id))

  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{label}</p>

      <div ref={containerRef} className="relative">
        {/* Chip area + text input */}
        <div
          className="flex flex-wrap items-center gap-1.5 w-full px-2 py-2 rounded-lg bg-surface border border-white/10 focus-within:border-white/30 transition-colors cursor-text min-h-9.5"
          onClick={() => inputRef.current?.focus()}
        >
          {value.map(item => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-white/10 text-xs text-white border border-white/15 shrink-0"
            >
              {item.label}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); remove(item.id) }}
                className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-muted hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onFocus={handleFocus}
            placeholder=""
            className="flex-1 min-w-20 bg-transparent text-white text-sm placeholder:text-muted outline-none py-0.5"
          />
        </div>

        <EntityResultsDropdown
          open={open}
          loading={loading}
          results={results}
          isUsed={id => value.some(v => v.id === id)}
          onSelect={select}
        />
      </div>
    </div>
  )
}
