/** Interactive toolbar controls for the kobayashi showcase: the spring-animated
 *  segmented control, the sort menu, the search box, and the windowed pager.
 *  Bespoke, animated variants of the app's shared controls — kept private to the
 *  showcase rather than added to the common component tree. */
"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowDown, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"


/* ─── Sort options ─────────────────────────────────────────────────────────── */

// `date_added` and `my_rating` are computed locally from the marks/ratings; the
// rest are delegated to VNDB. Local sorts can't be honoured alongside a text
// search (VNDB does the filtering), so a search falls back to VNDB ordering.
export type SortKey = "date_added" | "title" | "rating" | "released" | "my_rating"
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_added", label: "Date Added" },
  { value: "title",      label: "Title"      },
  { value: "rating",     label: "Rating"     },
  { value: "released",   label: "Released"   },
  { value: "my_rating",  label: "My Rating"  },
]
export const LOCAL_SORTS = new Set<SortKey>(["date_added", "my_rating"])
export const VNDB_SORT: Record<string, string> = { title: "title", rating: "rating", released: "released" }


/* ─── Segmented control ────────────────────────────────────────────────────── */

// Segmented control with a spring-sliding active pill. The pill's colour tone
// morphs as the selection moves between segments.
type Tone = "neutral" | "amber" | "red"
const TONE_BG: Record<Tone, string> = {
  neutral: "bg-white/20",
  amber:   "bg-amber-500/85",
  red:     "bg-red-500/85",
}
interface Segment<T extends string> { value: T; label: string; short: string; tone: Tone }

export function SegmentedControl<T extends string>({
  id, ariaLabel, value, segments, onChange,
}: {
  id: string
  ariaLabel: string
  value: T
  segments: Segment<T>[]
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 backdrop-blur-sm">
      {segments.map(seg => {
        const active = value === seg.value
        return (
          <button
            key={seg.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(seg.value)}
            className="relative rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className={cn("absolute inset-0 rounded-full transition-colors duration-300", TONE_BG[seg.tone])}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={cn("relative z-10", active ? "text-white" : "text-muted hover:text-white")}>
              <span className="sm:hidden">{seg.short}</span>
              <span className="hidden sm:inline">{seg.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}


/* ─── Sort menu ────────────────────────────────────────────────────────────── */

// Sort dropdown + asc/desc toggle. The menu is a small spring-in popover that
// closes on outside click.
export function SortMenu({ value, order, onChange, onToggleOrder }: {
  value: SortKey
  order: "asc" | "desc"
  onChange: (v: SortKey) => void
  onToggleOrder: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const current = SORT_OPTIONS.find(o => o.value === value)
  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-3 pr-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
      >
        {current?.label ?? "Sort"}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", open && "rotate-180")} />
      </button>
      <button
        type="button"
        aria-label={order === "desc" ? "Descending" : "Ascending"}
        onClick={onToggleOrder}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-white"
      >
        <motion.span
          animate={{ rotate: order === "asc" ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="flex"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-30 mt-2 min-w-40 overflow-hidden rounded-xl border border-white/10 bg-elevated/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            {SORT_OPTIONS.map(o => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    o.value === value ? "bg-white/10 text-accent" : "text-white/80 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {o.label}
                  {o.value === value && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}


/* ─── Search box ───────────────────────────────────────────────────────────── */

export function SearchBox({ value, onValueChange, onComposingChange }: {
  value: string
  onValueChange: (v: string) => void
  onComposingChange: (v: boolean) => void
}) {
  return (
    <div className="relative w-full sm:w-auto">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted/60" />
      <input
        type="text"
        value={value}
        onChange={e => onValueChange(e.target.value)}
        onCompositionStart={() => onComposingChange(true)}
        onCompositionEnd={e => { onComposingChange(false); onValueChange(e.currentTarget.value) }}
        placeholder="Search…"
        className="w-full rounded-full border border-white/10 bg-white/5 py-1.5 pl-8 pr-7 text-sm text-white outline-none transition-colors placeholder:text-muted/50 focus:border-white/30 focus:bg-white/10 sm:w-44"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}


/* ─── Pager ────────────────────────────────────────────────────────────────── */

// Windowed page list: 1 … current-1 current current+1 … total.
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | "…")[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) out.push("…")
  for (let p = start; p <= end; p++) out.push(p)
  if (end < total - 1) out.push("…")
  out.push(total)
  return out
}

export function PageNav({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const edgeBtn = "flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white/5"
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={edgeBtn}>
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageWindow(page, totalPages).map((it, i) =>
        it === "…" ? (
          <span key={`gap-${i}`} className="select-none px-1 text-sm text-muted/60">…</span>
        ) : (
          <button
            key={it}
            type="button"
            aria-current={it === page ? "page" : undefined}
            onClick={() => onChange(it)}
            className="relative flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition-colors"
          >
            {it === page && (
              <motion.span layoutId="kobayashi-page-active" className="absolute inset-0 rounded-xl bg-accent" transition={{ type: "spring", stiffness: 500, damping: 34 }} />
            )}
            <span className={cn("relative z-10", it === page ? "text-black" : "text-muted hover:text-white")}>{it}</span>
          </button>
        )
      )}

      <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={edgeBtn}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
