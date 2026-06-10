/** Shared machinery for the entity-picker comboboxes (`EntityFilter` /
 *  `EntityModeFilter`): result normalization, the debounced + IME-safe search
 *  state, and the results dropdown. The two pickers differ only in how chips
 *  are kept (flat list vs per-mode buckets), so everything else lives here. */
"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { EntityType } from "@/lib/config"


/* ─── Result normalization ─────────────────────────────────────────────────── */

export interface NormalizedResult {
  id: string
  name: string
  sub?: string       // muted secondary text (group name, original name, …)
  category?: string  // tag only — drives the colored badge
}

interface RawEntity {
  id: string
  name: string
  category?: string
  group_name?: string
  original?: string | null
}

export function normalizeEntity(type: EntityType, raw: RawEntity): NormalizedResult {
  switch (type) {
    case "tag":      return { id: raw.id, name: raw.name, category: raw.category }
    case "trait":    return { id: raw.id, name: raw.name, sub: raw.group_name }
    case "staff":    return { id: raw.id, name: raw.name, sub: raw.original ?? undefined }
    case "producer": return { id: raw.id, name: raw.name, sub: raw.original ?? undefined }
  }
}

function fetchByType(type: EntityType, params: Record<string, unknown>, signal: AbortSignal) {
  switch (type) {
    case "tag":      return api.small.tag(params, signal)
    case "trait":    return api.small.trait(params, signal)
    case "staff":    return api.small.staff(params, signal)
    case "producer": return api.small.producer(params, signal)
  }
}


/* ─── Search state hook ────────────────────────────────────────────────────── */

/** Debounced, abortable, IME-safe entity search feeding the dropdown. Owns the
 *  query/results/open state plus the container & input refs; the consumer wires
 *  the returned handlers onto its chip-box input and calls `clearAfterSelect`
 *  once a result has been added to its own selection state. */
export function useEntitySearch(entityType: EntityType, source?: string) {
  const [query, setQuery]             = useState("")
  const [results, setResults]         = useState<NormalizedResult[]>([])
  const [loading, setLoading]         = useState(false)
  const [open, setOpen]               = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef     = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  // Set right before we re-focus the input after a pick, so the synchronous
  // onFocus (which still sees the pre-pick `results`) doesn't reopen the just
  // closed dropdown. Consumed on the next focus.
  const suppressOpenRef = useRef(false)

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  /* Actual API call — called after debounce / IME commit */
  const search = (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); setLoading(false); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setOpen(true)
    fetchByType(entityType, { search: q, limit: 10, ...(source && source !== "both" ? { from: source } : {}) }, abortRef.current.signal)
      .then(res => { setResults(res.results.map(r => normalizeEntity(entityType, r))); setLoading(false) })
      .catch(e => { if (!(e instanceof DOMException && e.name === "AbortError")) setLoading(false) })
  }

  /* Keyboard input — skip debounce trigger while composing (IME) */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (isComposing) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  const handleCompositionStart = () => setIsComposing(true)

  /* IME composition end — commit the final composed text then debounce */
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false)
    const q = e.currentTarget.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  const handleFocus = () => {
    if (suppressOpenRef.current) { suppressOpenRef.current = false; return }
    if (results.length > 0 || loading) setOpen(true)
  }

  /* Reset the search after the consumer accepted a pick, keeping focus. */
  const clearAfterSelect = () => {
    setQuery("")
    setResults([])
    setLoading(false)
    setOpen(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    suppressOpenRef.current = true
    inputRef.current?.focus()
  }

  return {
    query, results, loading, open,
    containerRef, inputRef,
    handleChange, handleCompositionStart, handleCompositionEnd, handleFocus,
    clearAfterSelect,
  }
}


/* ─── Results dropdown ─────────────────────────────────────────────────────── */

const TAG_CATEGORY_LABEL: Record<string, string> = {
  cont: "Content",
  ero:  "Sexual",
  tech: "Technical",
}

const TAG_CATEGORY_CLS: Record<string, string> = {
  cont: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ero:  "bg-pink-500/15 text-pink-400 border-pink-500/20",
  tech: "bg-gray-400/15 text-gray-400 border-gray-400/20",
}

interface EntityResultsDropdownProps {
  open: boolean
  loading: boolean
  results: NormalizedResult[]
  /** Whether a result is already selected (renders dimmed / unclickable). */
  isUsed: (id: string) => boolean
  onSelect: (result: NormalizedResult) => void
}

export function EntityResultsDropdown({ open, loading, results, isUsed, onSelect }: EntityResultsDropdownProps) {
  if (!open) return null

  return (
    <div className="absolute z-50 top-full inset-x-0 mt-1 rounded-lg bg-elevated border border-white/10 shadow-xl overflow-hidden max-h-56 overflow-y-auto overscroll-contain animate-slide-down-fade">
      {loading ? (
        <p className="px-3 py-2.5 text-sm text-muted">Searching…</p>
      ) : results.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-muted">No results</p>
      ) : (
        results.map((result, idx) => {
          const already = isUsed(result.id)
          return (
            <button
              key={`${result.id}-${idx}`}
              type="button"
              onClick={() => !already && onSelect(result)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors",
                already ? "opacity-40 cursor-default" : "hover:bg-white/8 cursor-pointer"
              )}
            >
              <span className={cn("flex-1 truncate", already ? "text-muted" : "text-white")}>
                {result.name}
              </span>
              {result.category !== undefined ? (
                /* Tag: colored category badge */
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded border shrink-0",
                  TAG_CATEGORY_CLS[result.category] ?? "bg-white/5 text-muted border-white/10"
                )}>
                  {TAG_CATEGORY_LABEL[result.category] ?? result.category}
                </span>
              ) : result.sub ? (
                /* Others: muted secondary text */
                <span className="text-xs text-muted shrink-0 truncate max-w-28">
                  {result.sub}
                </span>
              ) : null}
            </button>
          )
        })
      )}
    </div>
  )
}
