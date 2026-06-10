/** Combined tag/trait picker: one search box whose chips each carry a "mode"
 *  — Include / Directed / Exclude — replacing the three separate boxes. A
 *  segmented control picks the mode for new picks; an existing chip's mode is
 *  cycled by clicking it. Each mode maps to its own backend bucket (e.g.
 *  tag / dtag / tag_exclude), kept as separate arrays by the parent. Search
 *  state and the results dropdown come from `entitySearch`. */
"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EntityItem, EntityType, EntityMode } from "@/lib/config"
import { useEntitySearch, EntityResultsDropdown, type NormalizedResult } from "./entitySearch"


/* ─── Mode metadata ────────────────────────────────────────────────────────── */
// Chip + selector styling per mode. Colors double as the legend: the active
// selector pill matches the chip color, so the color→meaning mapping is learnable.

const MODE_META: Record<EntityMode, { label: string; chip: string; pill: string }> = {
  include: {
    label: "Include",
    chip: "bg-white/10 border-white/15 text-white hover:bg-white/15",
    pill: "bg-white/20 text-white",
  },
  directed: {
    label: "Directed",
    chip: "bg-accent/15 border-accent/40 text-accent hover:bg-accent/25",
    pill: "bg-accent/25 text-accent",
  },
  exclude: {
    label: "Exclude",
    chip: "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25",
    pill: "bg-red-500/25 text-red-300",
  },
}


/* ─── Component ────────────────────────────────────────────────────────────── */

interface ModeDef { mode: EntityMode; value: string }

interface EntityModeFilterProps {
  label: string
  entityType: EntityType
  modes: ModeDef[]
  /** Items per bucket, keyed by the bucket's filter value (tag / dtag / …). */
  values: Record<string, EntityItem[]>
  /** Receives the full next bucket map — emitted in one call so a move between
   *  two buckets is a single, atomic parent state update. */
  onChange: (values: Record<string, EntityItem[]>) => void
  source?: string
}

export function EntityModeFilter({ label, entityType, modes, values, onChange, source }: EntityModeFilterProps) {
  const {
    query, results, loading, open,
    containerRef, inputRef,
    handleChange, handleCompositionStart, handleCompositionEnd, handleFocus,
    clearAfterSelect,
  } = useEntitySearch(entityType, source)
  const [addMode, setAddMode] = useState<EntityMode>(modes[0]?.mode ?? "include")

  const bucketForMode = (mode: EntityMode) => modes.find(m => m.mode === mode)?.value ?? modes[0].value
  // Every selected id across all buckets — a tag/trait lives in exactly one mode.
  const usedIds = new Set(modes.flatMap(m => (values[m.value] ?? []).map(i => i.id)))

  /* Add a result into the active mode's bucket */
  const select = (result: NormalizedResult) => {
    if (usedIds.has(result.id)) return
    const bucket = bucketForMode(addMode)
    onChange({ ...values, [bucket]: [...(values[bucket] ?? []), { id: result.id, label: result.name }] })
    clearAfterSelect()
  }

  const remove = (bucket: string, id: string) =>
    onChange({ ...values, [bucket]: (values[bucket] ?? []).filter(i => i.id !== id) })

  /* Move a chip to the next mode (Include → Directed → Exclude → Include) */
  const cycle = (bucket: string, item: EntityItem) => {
    const i = modes.findIndex(m => m.value === bucket)
    const next = modes[(i + 1) % modes.length]
    if (next.value === bucket) return
    onChange({
      ...values,
      [bucket]: (values[bucket] ?? []).filter(x => x.id !== item.id),
      [next.value]: [...(values[next.value] ?? []), item],
    })
  }

  return (
    <div>
      {/* Label + mode selector */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
        <div className="flex rounded-full border border-white/10 overflow-hidden">
          {modes.map(m => (
            <button
              key={m.mode}
              type="button"
              onClick={() => setAddMode(m.mode)}
              className={cn(
                "px-2 py-0.5 text-[11px] font-medium transition-colors leading-none",
                addMode === m.mode ? MODE_META[m.mode].pill : "text-muted hover:text-white hover:bg-white/10",
              )}
            >
              {MODE_META[m.mode].label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative">
        {/* Chip area + text input */}
        <div
          className="flex flex-wrap items-center gap-1.5 w-full px-2 py-2 rounded-lg bg-surface border border-white/10 focus-within:border-white/30 transition-colors cursor-text min-h-9.5"
          onClick={() => inputRef.current?.focus()}
        >
          {modes.flatMap(m =>
            (values[m.value] ?? []).map(item => (
              <span
                key={item.id}
                className={cn(
                  "inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs border shrink-0 transition-colors",
                  MODE_META[m.mode].chip,
                )}
              >
                <button
                  type="button"
                  title={`${MODE_META[m.mode].label} — click to change`}
                  onClick={e => { e.stopPropagation(); cycle(m.value, item) }}
                  className="cursor-pointer"
                >
                  {item.label}
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); remove(m.value, item.id) }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full opacity-70 hover:opacity-100 hover:bg-white/20 transition"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )),
          )}

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
          isUsed={id => usedIds.has(id)}
          onSelect={select}
        />
      </div>
    </div>
  )
}
