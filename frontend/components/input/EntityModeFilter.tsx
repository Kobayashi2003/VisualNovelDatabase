/** Combined tag/trait picker: one search box whose chips each carry a "mode"
 *  — Include / Directed / Exclude — replacing the three separate boxes. A
 *  segmented control picks the mode for new picks; an existing chip's mode is
 *  cycled by clicking it. Each mode maps to its own backend bucket (e.g.
 *  tag / dtag / tag_exclude), kept as separate arrays by the parent. */
"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { EntityItem, EntityType, EntityMode } from "@/lib/config"


/* ─── Result normalization (tag / trait only) ──────────────────────────────── */

interface NormalizedResult { id: string; name: string; sub?: string; category?: string }

const TAG_CATEGORY_LABEL: Record<string, string> = { cont: "Content", ero: "Sexual", tech: "Technical" }
const TAG_CATEGORY_CLS: Record<string, string> = {
  cont: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ero:  "bg-pink-500/15 text-pink-400 border-pink-500/20",
  tech: "bg-gray-400/15 text-gray-400 border-gray-400/20",
}

interface RawEntity { id: string; name: string; category?: string; group_name?: string }

function normalize(type: EntityType, raw: RawEntity): NormalizedResult {
  return type === "tag"
    ? { id: raw.id, name: raw.name, category: raw.category }
    : { id: raw.id, name: raw.name, sub: raw.group_name }
}

function fetchByType(type: EntityType, params: Record<string, unknown>, signal: AbortSignal) {
  return type === "tag" ? api.small.tag(params, signal) : api.small.trait(params, signal)
}


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
  const [query, setQuery]             = useState("")
  const [results, setResults]         = useState<NormalizedResult[]>([])
  const [loading, setLoading]         = useState(false)
  const [open, setOpen]               = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [addMode, setAddMode]         = useState<EntityMode>(modes[0]?.mode ?? "include")

  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef        = useRef<AbortController | null>(null)
  const containerRef    = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)
  const suppressOpenRef = useRef(false)

  const bucketForMode = (mode: EntityMode) => modes.find(m => m.mode === mode)?.value ?? modes[0].value
  // Every selected id across all buckets — a tag/trait lives in exactly one mode.
  const usedIds = new Set(modes.flatMap(m => (values[m.value] ?? []).map(i => i.id)))

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const search = (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); setLoading(false); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setOpen(true)
    fetchByType(entityType, { search: q, limit: 10, ...(source && source !== "both" ? { from: source } : {}) }, abortRef.current.signal)
      .then(res => { setResults(res.results.map(r => normalize(entityType, r))); setLoading(false) })
      .catch(e => { if (!(e instanceof DOMException && e.name === "AbortError")) setLoading(false) })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (isComposing) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false)
    const q = e.currentTarget.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  /* Add a result into the active mode's bucket */
  const select = (result: NormalizedResult) => {
    if (usedIds.has(result.id)) return
    const bucket = bucketForMode(addMode)
    onChange({ ...values, [bucket]: [...(values[bucket] ?? []), { id: result.id, label: result.name }] })
    setQuery("")
    setResults([])
    setLoading(false)
    setOpen(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    suppressOpenRef.current = true
    inputRef.current?.focus()
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
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={handleCompositionEnd}
            onFocus={() => {
              if (suppressOpenRef.current) { suppressOpenRef.current = false; return }
              if (results.length > 0 || loading) setOpen(true)
            }}
            placeholder=""
            className="flex-1 min-w-20 bg-transparent text-white text-sm placeholder:text-muted outline-none py-0.5"
          />
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full inset-x-0 mt-1 rounded-lg bg-elevated border border-white/10 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-2.5 text-sm text-muted">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted">No results</p>
            ) : (
              results.map((result, idx) => {
                const already = usedIds.has(result.id)
                return (
                  <button
                    key={`${result.id}-${idx}`}
                    type="button"
                    onClick={() => !already && select(result)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors",
                      already ? "opacity-40 cursor-default" : "hover:bg-white/8 cursor-pointer",
                    )}
                  >
                    <span className={cn("flex-1 truncate", already ? "text-muted" : "text-white")}>
                      {result.name}
                    </span>
                    {result.category !== undefined ? (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded border shrink-0",
                        TAG_CATEGORY_CLS[result.category] ?? "bg-white/5 text-muted border-white/10",
                      )}>
                        {TAG_CATEGORY_LABEL[result.category] ?? result.category}
                      </span>
                    ) : result.sub ? (
                      <span className="text-xs text-muted shrink-0 truncate max-w-28">{result.sub}</span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
