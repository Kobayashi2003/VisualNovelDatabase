/** Public, read-only showcase of kobayashi's `Playing` / `Played` VN collections.
 *  Logged-in viewers only (covers depend on an authenticated image session).
 *
 *  Self-contained by design: every control here (auth, tabs, sort, search,
 *  content-level filters, pagination, cards, cursor) is implemented in this file
 *  rather than pulled from shared components. Spotify-flavoured dark UI — a
 *  fanned cover-collage hero, a pin-to-top toolbar, a scroll-revealed grid, and
 *  a custom cursor. */
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, animate, motion, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform, type Variants, type Transition } from "motion/react"
import { ArrowDown, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, KeyRound, Library, Loader2, Lock, Mail, Search, Star, Ticket, User, X } from "lucide-react"

import { api } from "@/lib/api"
import { cn, shouldBlur } from "@/lib/utils"
import { PAGE_LIMIT } from "@/lib/constants"
import { displayTitle, displayName } from "@/lib/original"
import { validateUsername, validateEmail, validatePassword, PASSWORD_MIN_LENGTH } from "@/lib/validation"
import { useUserContext } from "@/context/UserContext"
import { useSearchContext } from "@/context/SearchContext"
import type { PublicVNCollections, VN_Small, Mark, SexualLevel, ViolenceLevel, VNDBQueryParams } from "@/lib/types"


// The fixed account this page showcases, and the two tabs (in display order).
const USERNAME = "kobayashi"
const TABS = [
  { key: "playing", label: "Playing" },
  { key: "played",  label: "Played"  },
] as const
type TabKey = typeof TABS[number]["key"]

// Max number of covers fanned out behind the title, and the size of the Played
// pool we hydrate to draw (and re-draw, on shuffle) those covers from.
const COLLAGE_SIZE = 5
const POOL_SIZE = 18

const GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"

// Sort options. `date_added` and `my_rating` are computed locally from the
// marks/ratings; the rest are delegated to VNDB. Local sorts can't be honoured
// alongside a text search (VNDB does the filtering), so a search falls back to
// VNDB's relevance ordering.
type SortKey = "date_added" | "title" | "rating" | "released" | "my_rating"
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_added", label: "Date Added" },
  { value: "title",      label: "Title"      },
  { value: "rating",     label: "Rating"     },
  { value: "released",   label: "Released"   },
  { value: "my_rating",  label: "My Rating"  },
]
const LOCAL_SORTS = new Set<SortKey>(["date_added", "my_rating"])
const VNDB_SORT: Record<string, string> = { title: "title", rating: "rating", released: "released" }

// Most-recent-first by ISO timestamp (string compare is correct for ISO).
const byRecent = (a: Mark, b: Mark) => b.marked_at.localeCompare(a.marked_at)
const markId = (id: string) => parseInt(id.replace(/^[a-z]+/, ""), 10)


/* ─── Small self-contained UI primitives ──────────────────────────────────── */

// Personal-rating pill drawn over a cover's corner.
function RatingBadge({ value }: { value: number }) {
  return (
    <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 rounded-full bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-yellow-400 backdrop-blur-sm">
      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
      {value}
    </div>
  )
}

// Animated count-up used for the hero stats.
function Counter({ value }: { value: number }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, v => Math.round(v).toString())
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [value, mv])
  return <motion.span>{text}</motion.span>
}


// Bouncing-dot loader in the accent colour.
function Loader() {
  return (
    <div role="status" aria-label="Loading" className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-accent"
          animate={{ y: [0, -9, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="text-sm text-red-400">{message}</p>
    </div>
  )
}

// Segmented control with a spring-sliding active pill. The pill's colour tone
// morphs as the selection moves between segments.
type Tone = "neutral" | "amber" | "red"
const TONE_BG: Record<Tone, string> = {
  neutral: "bg-white/20",
  amber:   "bg-amber-500/85",
  red:     "bg-red-500/85",
}
interface Segment<T extends string> { value: T; label: string; short: string; tone: Tone }

function SegmentedControl<T extends string>({
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

function PageNav({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
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

// Sort dropdown + asc/desc toggle. The menu is a small spring-in popover that
// closes on outside click.
function SortMenu({ value, order, onChange, onToggleOrder }: {
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

function SearchBox({ value, onValueChange, onComposingChange }: {
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

// Cover card: blur honours the content-level selectors; hover scales the art,
// brightens the ring, and reveals the title over a gradient.
function VNCard({ vn, rating, showOriginal, sexualLevel, violenceLevel }: {
  vn: VN_Small
  rating: number
  showOriginal: boolean
  sexualLevel: SexualLevel
  violenceLevel: ViolenceLevel
}) {
  const title = displayTitle(vn, showOriginal)
  const developer = vn.developers?.[0] ? displayName(vn.developers[0], showOriginal) : ""
  const year = vn.released ? vn.released.substring(0, 4) : ""
  const img = vn.image
  const url = img?.thumbnail || img?.url || ""
  const blur = img ? shouldBlur(img.sexual, img.violence, sexualLevel, violenceLevel) : false

  // Cursor-following 3D tilt on the cover (spring-smoothed, resets on leave).
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), { stiffness: 200, damping: 18 })
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), { stiffness: 200, damping: 18 })

  return (
    <Link href={`/${vn.id}`} className="group block" style={{ perspective: 800 }}>
      <motion.div
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect()
          px.set((e.clientX - r.left) / r.width - 0.5)
          py.set((e.clientY - r.top) / r.height - 0.5)
        }}
        onMouseLeave={() => { px.set(0); py.set(0) }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative aspect-[3/4] overflow-hidden rounded-xl bg-elevated ring-1 ring-white/10 transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-black/60 group-hover:ring-white/30"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={title}
            loading="lazy"
            draggable={false}
            className={cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]", blur && "blur-lg group-hover:blur-none")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-muted/40">♥</div>
        )}
        {rating > 0 && <RatingBadge value={rating} />}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-3 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{title}</p>
        </div>
      </motion.div>
      {(developer || year) && (
        <p className="mt-2 line-clamp-1 px-0.5 text-xs text-muted">{[developer, year].filter(Boolean).join(" · ")}</p>
      )}
    </Link>
  )
}


/* ─── Hero cover collage (fanned covers; click to shuffle) ─────────────────── */

interface Cover { id: string; url: string; blur: boolean }

// Snappy spring for the hover lift; a bouncier one for fan position + shuffle
// so cards arc and overshoot into place. Tilt uses its own soft spring.
const collageCardTransition: Transition = { type: "spring", stiffness: 260, damping: 22 }
const collagePosTransition: Transition = { type: "spring", stiffness: 220, damping: 15 }
const collageTiltSpring = { stiffness: 200, damping: 18 }

// Horizontal step between fanned cards (they overlap, so < card width).
const COLLAGE_SPREAD = 52

// Fisher–Yates, returning a new array.
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pick `count` distinct pool indices in random order (used by the shuffle).
function pickSelection(poolLen: number, count: number): number[] {
  if (poolLen <= 0 || count <= 0) return []
  return shuffled(Array.from({ length: poolLen }, (_, i) => i)).slice(0, count)
}

// One fanned cover. Outer = stable hit zone + fan slot + z-index (it only moves
// on shuffle, so the pointer can't fall off it mid-hover). Inner = the visual
// that lifts/scales/straightens on hover and tilts toward the cursor in its OWN
// per-card 3D space — keeping perspective off the shared stack means z-index,
// not 3D depth, decides which card sits on top.
function CollageCard({ cover, slot, mid, isHovered, onHover, onLeave }: {
  cover: Cover
  slot: number
  mid: number
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const offset = slot - mid
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [12, -12]), collageTiltSpring)
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-14, 14]), collageTiltSpring)

  return (
    <motion.div
      onMouseEnter={onHover}
      onMouseLeave={() => { onLeave(); px.set(0); py.set(0) }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        px.set((e.clientX - r.left) / r.width - 0.5)
        py.set((e.clientY - r.top) / r.height - 0.5)
      }}
      initial={{ opacity: 0, x: 0, y: 64, rotate: 0, scale: 0.85 }}
      animate={{ opacity: 1, x: offset * COLLAGE_SPREAD, y: Math.abs(offset) * 8, rotate: offset * 7, scale: 1 }}
      exit={{ opacity: 0, y: 48, scale: 0.85, transition: { duration: 0.18 } }}
      transition={{ ...collagePosTransition, delay: Math.abs(offset) * 0.04 }}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        marginLeft: -60,   // half of w-30 → centre the card in the box
        marginTop: -88,    // half of h-44
        zIndex: isHovered ? 50 : 10 - Math.abs(Math.round(offset)),
        perspective: 700,
      }}
      className="h-44 w-30"
    >
      <motion.div
        initial={false}
        animate={{ y: isHovered ? -34 : 0, scale: isHovered ? 1.1 : 1, rotate: isHovered ? -offset * 7 : 0 }}
        transition={collageCardTransition}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="h-full w-full overflow-hidden rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/15"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover.url} alt="" draggable={false} className={cn("h-full w-full object-cover", cover.blur && "blur-md")} />
      </motion.div>
    </motion.div>
  )
}

function CoverCollage({ covers }: { covers: Cover[] }) {
  const count = Math.min(COLLAGE_SIZE, covers.length)
  // `selection` is the list of pool indices currently fanned out, in slot
  // order. Clicking re-draws a fresh random selection from the pool, so the
  // shuffle changes both the arrangement *and* which covers are shown.
  const [selection, setSelection] = useState<number[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // On (re)load of the pool, show the most-recent `count` covers, in order.
  useEffect(() => {
    setSelection(Array.from({ length: Math.min(COLLAGE_SIZE, covers.length) }, (_, i) => i))
  }, [covers.length])

  if (covers.length === 0) return null
  const sel = selection.length ? selection : Array.from({ length: count }, (_, i) => i)
  const mid = (sel.length - 1) / 2

  const shuffle = () => {
    setHoveredId(null)
    setSelection(pickSelection(covers.length, count))
  }

  return (
    <div
      data-cursor="pointer"
      className="relative hidden h-56 w-[360px] shrink-0 cursor-pointer select-none sm:block"
      onClick={shuffle}
      title="Shuffle"
    >
      {/* Soft floor shadow grounding the fan. */}
      <div aria-hidden className="absolute bottom-4 left-1/2 h-5 w-2/3 -translate-x-1/2 rounded-[50%] bg-black/50 blur-xl" />
      <AnimatePresence>
        {sel.map((coverIdx, slot) => {
          const c = covers[coverIdx]
          if (!c) return null
          return (
            <CollageCard
              key={c.id}
              cover={c}
              slot={slot}
              mid={mid}
              isHovered={hoveredId === c.id}
              onHover={() => setHoveredId(c.id)}
              onLeave={() => setHoveredId(prev => (prev === c.id ? null : prev))}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}


/* ─── A single cover cell in the grid ──────────────────────────────────────── */

// `custom` is the card's index; the column-based delay gives each row a quick
// left-to-right cascade as it scrolls into view.
const cellVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(12px)" },
  show: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: (i % 6) * 0.05 },
  }),
}

function VNCell({
  vn, rating, index, showOriginal, sexualLevel, violenceLevel,
}: {
  vn: VN_Small
  rating: number
  index: number
  showOriginal: boolean
  sexualLevel: SexualLevel
  violenceLevel: ViolenceLevel
}) {
  return (
    <motion.div
      custom={index}
      variants={cellVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      whileHover={{ y: -4 }}
      className="relative"
    >
      <VNCard vn={vn} rating={rating} showOriginal={showOriginal} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
    </motion.div>
  )
}


/* ─── Hero title: per-letter reveal + magnetic cursor pull ─────────────────── */

const LETTER: Variants = {
  hidden: { opacity: 0, y: "0.5em", filter: "blur(8px)" },
  show:   { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

function HeroTitle({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 150, damping: 15 })
  const y = useSpring(my, { stiffness: 150, damping: 15 })

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onMouseMove={e => {
        const r = ref.current!.getBoundingClientRect()
        mx.set((e.clientX - (r.left + r.width / 2)) * 0.06)
        my.set((e.clientY - (r.top + r.height / 2)) * 0.06)
      }}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
      className="mt-2 inline-block"
    >
      {/* The name links home; `w-fit` keeps the hit area tight to the text. */}
      <Link href="/" aria-label="Go to home">
      <motion.h1
        aria-label={name}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
        className="flex w-fit pb-[0.18em] text-5xl font-black leading-[1.2] tracking-tight drop-shadow-sm sm:text-7xl lg:text-8xl"
      >
        {name.split("").map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            variants={LETTER}
            className="inline-block bg-linear-to-br from-white to-white/70 bg-clip-text text-transparent"
          >
            {ch === " " ? " " : ch}
          </motion.span>
        ))}
      </motion.h1>
      </Link>
    </motion.div>
  )
}


/* ─── Auth panel (shown when the viewer isn't signed in) ───────────────────── */

// Shared styling for the auth inputs; `pl-10` leaves room for a leading icon,
// and callers add the right padding (`pr-3`, or `pr-10` when there's a trailing
// control like the password eye).
const AUTH_INPUT = "w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 text-sm text-white outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:bg-white/[0.07]"

function AuthField({ icon: Icon, ...props }: { icon: React.ComponentType<{ className?: string }> } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
      <input {...props} className={cn(AUTH_INPUT, "pr-3")} />
    </div>
  )
}

function AuthPasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(AUTH_INPUT, "pr-10")}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(s => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/60 transition-colors hover:text-white"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

// Glassy two-mode (sign in / sign up) auth card. The context's login/register
// reload the page on success, so a successful submit just navigates onward.
function AuthPanel() {
  const { login, register } = useUserContext()
  const [mode, setMode] = useState<"login" | "register">("login")

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [invitationCode, setInvitationCode] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [codeSending, setCodeSending] = useState(false)
  const [codeNotice, setCodeNotice] = useState("")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const switchMode = (m: "login" | "register") => { setMode(m); setError(""); setCodeNotice("") }

  const handleSendCode = async () => {
    const emailError = validateEmail(email)
    if (emailError) { setError(emailError); return }
    setError(""); setCodeNotice(""); setCodeSending(true)
    try {
      await api.user.sendVerificationCode(email)
      setCodeNotice("Code sent — check your email.")
      setCooldown(60)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code.")
    } finally {
      setCodeSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      if (mode === "login") {
        setLoading(true)
        await login(username, password)
      } else {
        if (!invitationCode.trim()) { setError("Enter your invitation code."); return }
        const ue = validateUsername(username); if (ue) { setError(ue); return }
        const ee = validateEmail(email); if (ee) { setError(ee); return }
        if (!code.trim()) { setError("Enter the verification code from your email."); return }
        const pe = validatePassword(password); if (pe) { setError(pe); return }
        if (password !== confirmPassword) { setError("Passwords do not match."); return }
        setLoading(true)
        await register(username, email, password, code, invitationCode)
      }
      // On success the context reloads the page; nothing more to do here.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const sendLabel = cooldown > 0 ? `${cooldown}s` : codeSending ? "…" : "Send"

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] max-w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/50 backdrop-blur-xl"
      >
        <div className="mb-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Visual Novel Collection</p>
          <h1 className="mt-1 bg-linear-to-br from-white to-white/70 bg-clip-text text-3xl font-black tracking-tight text-transparent">{USERNAME}</h1>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex rounded-full border border-white/10 bg-white/5 p-1">
          {(["login", "register"] as const).map(m => (
            <button key={m} type="button" onClick={() => switchMode(m)} className="relative flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors">
              {mode === m && <motion.span layoutId="auth-pill" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className={cn("relative z-10", mode === m ? "text-black" : "text-muted hover:text-white")}>{m === "login" ? "Sign in" : "Sign up"}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Fields fade in when the mode changes (re-keyed). */}
          <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-3">
            {mode === "register" && (
              <AuthField icon={Ticket} value={invitationCode} onChange={e => setInvitationCode(e.target.value)} placeholder="Invitation code" />
            )}
            <AuthField icon={User} value={username} onChange={e => setUsername(e.target.value)} placeholder={mode === "login" ? "Username or email" : "Username"} autoComplete="username" />
            {mode === "register" && (
              <AuthField icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
            )}
            {mode === "register" && (
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="6-digit code"
                      className={cn(AUTH_INPUT, "pr-3")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={codeSending || cooldown > 0}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-40"
                  >
                    {sendLabel}
                  </button>
                </div>
                {codeNotice && <p className="px-1 text-xs text-accent">{codeNotice}</p>}
              </div>
            )}
            <AuthPasswordField value={password} onChange={setPassword} placeholder={mode === "login" ? "Password" : `Password (${PASSWORD_MIN_LENGTH}+ characters)`} />
            {mode === "register" && (
              <AuthPasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
            )}
          </motion.div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-bold text-black transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {loading ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Sign in" : "Create account")}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")} className="font-semibold text-white hover:text-accent">
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  )
}


/* ─── Spotify-style custom cursor ──────────────────────────────────────────── */

// A precise accent dot + a spring-trailing ring. The ring swells and turns
// accent-green over interactive elements; both react to clicks. Only on fine
// pointers, and disabled under reduced-motion (native cursor stays). The native
// cursor is hidden (page-scoped) once the pointer first moves.
function CustomCursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const ringX = useSpring(x, { stiffness: 350, damping: 28, mass: 0.6 })
  const ringY = useSpring(y, { stiffness: 350, damping: 28, mass: 0.6 })
  const [enabled, setEnabled] = useState(false)
  const [moved, setMoved] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!window.matchMedia("(pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setEnabled(true)
    const move = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setMoved(true)
      const t = e.target as Element | null
      setHovering(!!t?.closest('a, button, input, select, [role="button"], [data-cursor]'))
    }
    const down = () => setPressed(true)
    const up = () => setPressed(false)
    window.addEventListener("mousemove", move)
    window.addEventListener("mousedown", down)
    window.addEventListener("mouseup", up)
    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mousedown", down)
      window.removeEventListener("mouseup", up)
    }
  }, [x, y])

  if (!enabled) return null

  return (
    <>
      {moved && <style>{".kby-cursor,.kby-cursor *{cursor:none !important}"}</style>}
      {/* Trailing ring */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] -ml-4 -mt-4 h-8 w-8 rounded-full border"
        style={{ x: ringX, y: ringY }}
        animate={{
          scale: pressed ? 0.8 : hovering ? 1.9 : 1,
          borderColor: hovering ? "rgba(29,185,84,0.9)" : "rgba(255,255,255,0.4)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />
      {/* Precise dot */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] -ml-1 -mt-1 h-2 w-2 rounded-full bg-accent"
        style={{ x, y }}
        animate={{ scale: pressed ? 0.6 : hovering ? 0.5 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </>
  )
}


/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function KobayashiPage() {
  const { user, isLoading: authLoading, defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const { showOriginal } = useSearchContext()

  /* ── State ─────────────────────────────────────────────────────────────── */

  const [sexualLevel, setSexualLevel]     = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)

  const [data, setData]       = useState<PublicVNCollections | null>(null)
  const [status, setStatus]   = useState<"loading" | "error" | null>("loading")
  const [errorMsg, setErrorMsg] = useState("")

  const [tab, setTab]     = useState<TabKey>("playing")
  const [page, setPage]   = useState(1)
  const [sort, setSort]   = useState<SortKey>("date_added")
  const [order, setOrder] = useState<"asc" | "desc">("desc")

  // Search: local input (IME-safe) committed to `q` after a debounce.
  const [searchInput, setSearchInput] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const [q, setQ] = useState("")

  // The hydrated page tagged with the request key it belongs to (so a stale
  // tab/sort/search/page never shows), plus the total result count for paging.
  const [loaded, setLoaded] = useState<{ key: string; items: VN_Small[]; count: number }>({ key: "", items: [], count: 0 })
  // Pool of hydrated Played covers the hero collage draws (and re-draws) from.
  const [pool, setPool]     = useState<VN_Small[]>([])
  // Marks the toolbar's natural position; used both for the pin transform and
  // to compute where to scroll back to after a results-changing operation.
  const sentinelRef = useRef<HTMLDivElement>(null)

  /* ── Effects, derived state & handlers ─────────────────────────────────── */

  /* Fetch the two collections once a signed-in viewer is present. */
  useEffect(() => {
    if (authLoading) return
    if (!user) { setStatus(null); return }
    let cancelled = false
    setStatus("loading")
    api.publicCollections.vn(USERNAME)
      .then(res => { if (!cancelled) { setData(res); setStatus(null) } })
      .catch(e => { if (!cancelled) { setStatus("error"); setErrorMsg(e?.message ?? "Failed to load") } })
    return () => { cancelled = true }
  }, [user, authLoading])

  /* Marks grouped per tab: merge same-named categories (case-insensitive),
     dedupe by id keeping the latest mark, newest first. */
  const marksByTab = useMemo(() => {
    const pick = (name: string) => {
      const byId = new Map<number, Mark>()
      for (const c of data?.collections ?? []) {
        if (c.category_name.trim().toLowerCase() !== name) continue
        for (const m of c.marks) {
          const cur = byId.get(m.id)
          if (!cur || m.marked_at > cur.marked_at) byId.set(m.id, m)
        }
      }
      return Array.from(byId.values()).sort(byRecent)
    }
    return { playing: pick("playing"), played: pick("played") }
  }, [data])

  const totalUnique = useMemo(() => {
    const ids = new Set<number>()
    for (const m of marksByTab.playing) ids.add(m.id)
    for (const m of marksByTab.played)  ids.add(m.id)
    return ids.size
  }, [marksByTab])

  const activeMarks = marksByTab[tab]
  const requestKey = `${tab}|${sort}|${order}|${q}|${page}`

  // Ids of the active tab sorted locally (for the date_added / my_rating sorts);
  // VNDB-delegated sorts ignore this and order the full id set server-side.
  const localSortedIds = useMemo(() => {
    const ratings = data?.ratings ?? {}
    const sorted = [...activeMarks]
    if (sort === "my_rating") {
      sorted.sort((a, b) => {
        const ra = ratings[a.id] ?? 0, rb = ratings[b.id] ?? 0
        if (ra !== rb) return order === "asc" ? ra - rb : rb - ra
        return b.marked_at.localeCompare(a.marked_at)
      })
    } else {
      sorted.sort((a, b) => order === "asc" ? a.marked_at.localeCompare(b.marked_at) : b.marked_at.localeCompare(a.marked_at))
    }
    return sorted.map(m => m.id)
  }, [activeMarks, sort, order, data])

  /* Hydrate the hero collage pool from the Played list. The collage samples up
     to COLLAGE_SIZE of these covers and re-draws among them when clicked. */
  useEffect(() => {
    const ids = marksByTab.played.slice(0, POOL_SIZE).map(m => m.id)
    if (ids.length === 0) { setPool([]); return }
    const ctrl = new AbortController()
    api.small.byIds.vn(ids, { limit: POOL_SIZE }, ctrl.signal)
      .then(res => {
        const map = new Map(res.results.map(v => [markId(v.id), v]))
        setPool(ids.map(id => map.get(id)).filter(Boolean) as VN_Small[])
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [marksByTab.played])

  /* Hydrate the current page for the active tab/sort/search, tagged with its
     request key so a stale result never shows. Local sorts paginate the marks
     client-side then hydrate that page; VNDB sorts (and any search) hand the
     whole id set to VNDB and let it sort / filter / paginate. The cleanup
     aborts any in-flight fetch, so a stale response never overwrites a newer. */
  useEffect(() => {
    const allIds = activeMarks.map(m => m.id)
    if (allIds.length === 0) {
      setLoaded({ key: data ? requestKey : "", items: [], count: 0 })
      return
    }
    const ctrl = new AbortController()
    const run = async () => {
      if (!q && LOCAL_SORTS.has(sort)) {
        const pageIds = localSortedIds.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT)
        const res = await api.small.byIds.vn(pageIds, { limit: PAGE_LIMIT }, ctrl.signal)
        const map = new Map(res.results.map(v => [markId(v.id), v]))
        setLoaded({ key: requestKey, items: pageIds.map(id => map.get(id)).filter(Boolean) as VN_Small[], count: allIds.length })
      } else {
        const vndbSort = q && LOCAL_SORTS.has(sort) ? "searchrank" : (VNDB_SORT[sort] ?? "title")
        const params: VNDBQueryParams = { sort: vndbSort, reverse: order === "desc", page, limit: PAGE_LIMIT, ...(q ? { search: q } : {}) }
        const res = await api.small.byIds.vn(allIds, params, ctrl.signal)
        setLoaded({ key: requestKey, items: res.results, count: res.count })
      }
    }
    run().catch(e => { if (e?.name !== "AbortError") setLoaded({ key: requestKey, items: [], count: 0 }) })
    return () => ctrl.abort()
  }, [requestKey, activeMarks, localSortedIds, q, sort, order, page, data])

  const covers: Cover[] = pool
    .filter(v => v.image)
    .map(v => ({
      id: v.id,
      url: v.image!.thumbnail || v.image!.url,
      blur: shouldBlur(v.image!.sexual, v.image!.violence, sexualLevel, violenceLevel),
    }))

  // After a results-changing op, return to the top of the results — but if the
  // title is already hidden (toolbar pinned), stop at the pin line so the
  // toolbar stays stuck and the title stays hidden instead of popping back up.
  //
  // The pinned check is read NOW (against the current layout, before React
  // commits the change), but the scroll itself is deferred to the next frame —
  // i.e. AFTER the new results render. This matters for search: filtering a long
  // list down to a few matches collapses the document height, and if we scrolled
  // against the old tall layout the browser would clamp the scroll up past the
  // pin line and re-reveal the hero. Scrolling post-commit avoids that clamp.
  const resetScroll = () => {
    const s = sentinelRef.current
    const wasPinned = !!s && s.getBoundingClientRect().top <= 0
    requestAnimationFrame(() => {
      const el = sentinelRef.current
      if (!wasPinned || !el) { window.scrollTo({ top: 0, behavior: "smooth" }); return }
      const pinTop = el.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: pinTop + 2, behavior: "smooth" })
    })
  }

  // Debounced, IME-safe commit of the search box to `q`. Only fires when the
  // trimmed value actually changes, and resets to page 1 on a new query.
  useEffect(() => {
    if (isComposing) return
    const next = searchInput.trim()
    if (next === q) return
    const t = setTimeout(() => { setQ(next); setPage(1); resetScroll() }, 300)
    return () => clearTimeout(t)
  }, [searchInput, isComposing, q])

  const selectTab   = (key: TabKey) => { setTab(key); setPage(1); resetScroll() }
  const selectSort  = (s: SortKey) => { setSort(s); setPage(1); resetScroll() }
  const toggleOrder = () => { setOrder(o => (o === "desc" ? "asc" : "desc")); setPage(1); resetScroll() }

  // The current page is ready to show only when the hydrated items belong to
  // the active request — otherwise a fetch is still in flight.
  const ready = loaded.key === requestKey
  const totalPages = Math.max(1, Math.ceil(loaded.count / PAGE_LIMIT))

  const goToPage = (p: number) => {
    setPage(p)
    resetScroll()
  }

  // Scroll-collapsing hero: as the page scrolls down the hero fades and drifts
  // upward, and re-reveals on the way back up. (The toolbar pins itself to the
  // top via the sentinel + transform below — not CSS sticky.)
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0])
  const heroY       = useTransform(scrollY, [0, 200], [0, -32])
  const heroScale   = useTransform(scrollY, [0, 200], [1, 0.96])

  // Pin the controls bar to the top ourselves rather than via `position:
  // sticky` — this page's nested scroll containers (root html/body use
  // overflow-x-hidden, which forces overflow-y:auto) defeat CSS sticky. The
  // sentinel (declared above) marks the bar's natural position; once it scrolls
  // above the viewport top we translate the bar down by the same amount so it
  // stays pinned at the top, and flag `stuck` for the frosted-toolbar styling.
  const barY = useMotionValue(0)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const s = sentinelRef.current
      if (!s) { barY.set(0); setStuck(false); return }
      const top = s.getBoundingClientRect().top
      const offset = top < 0 ? -top : 0
      barY.set(offset)
      setStuck(offset > 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [status, barY])

  // Cursor spotlight that softly follows the mouse across the results grid.
  const spotX = useMotionValue(-9999)
  const spotY = useMotionValue(-9999)
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${spotX}px ${spotY}px, rgba(255,255,255,0.06), transparent 72%)`

  /* ── Gated states ─────────────────────────────────────────────────────── */

  if (authLoading) {
    return <div className="flex flex-1 items-center justify-center py-32"><Loader /></div>
  }

  if (!user) {
    return <AuthPanel />
  }

  /* ── Page ─────────────────────────────────────────────────────────────── */

  return (
    <main className="kby-cursor relative flex-1">
      <CustomCursor />
      {/* Hero — simply fades + drifts away as the page scrolls (no background
          wash), and re-reveals on scroll up. */}
      <motion.header style={{ opacity: heroOpacity }} className="relative">
        <motion.div
          style={{ y: heroY, scale: heroScale, transformOrigin: "top left" }}
          className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 pt-12 pb-10 sm:flex-row sm:items-end lg:px-6 lg:pt-16"
        >
          <CoverCollage covers={covers} />

          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60"
            >
              Visual Novel Collection
            </motion.p>
            <HeroTitle name={data?.username ?? USERNAME} />
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
              className="mt-4 text-sm text-muted"
            >
              {data ? (
                <>
                  <span className="font-semibold text-white"><Counter value={totalUnique} /></span> titles
                  <span className="mx-1.5 text-white/30">·</span>
                  <Counter value={marksByTab.playing.length} /> playing
                  <span className="mx-1.5 text-white/30">·</span>
                  <Counter value={marksByTab.played.length} /> played
                </>
              ) : (
                <span className="opacity-0">loading</span>
              )}
            </motion.p>
          </div>
        </motion.div>
      </motion.header>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-6">
        {status === "loading" && (
          <div className="flex justify-center py-24"><Loader /></div>
        )}

        {status === "error" && (
          <ErrorMessage message={errorMsg || "Failed to load collection"} />
        )}

        {status === null && data && (
          <>
            {/* Zero-height marker for the bar's natural position (see the pin
                effect above). */}
            <div ref={sentinelRef} aria-hidden className="h-0" />

            {/* Controls: animated tab pill + content-level selectors. On this
                page there is no global header, so once the hero scrolls away
                this row pins flush to the very top and transforms into a frosted
                toolbar — its background, shadow and a compact title all animate
                in (see `stuck`). */}
            <motion.div style={{ y: barY }} className="relative z-20 mb-6">
              {/* Full-bleed frosted background — spans the whole viewport width
                  when pinned, and is invisible while resting in the page flow. */}
              <div
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 border-b transition-[background-color,border-color,box-shadow] duration-300",
                  stuck
                    ? "border-white/5 bg-background/80 shadow-lg shadow-black/30 backdrop-blur-xl"
                    : "border-transparent bg-transparent shadow-none",
                )}
              />

              <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center">
              {/* Compact title that expands in once the toolbar pins — the
                  hero's name "collapsing" down into the toolbar. Links home;
                  non-interactive (and untabbable) while collapsed. */}
              <Link
                href="/"
                aria-label="Go to home"
                aria-hidden={!stuck}
                tabIndex={stuck ? 0 : -1}
                className={cn(
                  "overflow-hidden whitespace-nowrap text-lg font-black tracking-tight text-white transition-all duration-300 hover:text-accent",
                  stuck ? "mr-3 max-w-[12rem] opacity-100" : "pointer-events-none mr-0 max-w-0 opacity-0",
                )}
              >
                {data.username || USERNAME}
              </Link>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
                {TABS.map(t => {
                  const active = tab === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => selectTab(t.key)}
                      className="relative rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                    >
                      {active && (
                        <motion.span
                          layoutId="kobayashi-tab-pill"
                          className="absolute inset-0 rounded-full bg-accent"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className={cn("relative z-10", active ? "text-black" : "text-muted hover:text-white")}>
                        {t.label}
                        <span className={cn("ml-1.5 tabular-nums", active ? "text-black/70" : "text-white/40")}>
                          {marksByTab[t.key].length}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SearchBox value={searchInput} onValueChange={setSearchInput} onComposingChange={setIsComposing} />
                <SortMenu value={sort} order={order} onChange={selectSort} onToggleOrder={toggleOrder} />
                <SegmentedControl
                  id="sexual"
                  ariaLabel="Sexual content level"
                  value={sexualLevel}
                  onChange={setSexualLevel}
                  segments={[
                    { value: "safe",       label: "Safe",       short: "Safe", tone: "neutral" },
                    { value: "suggestive", label: "Suggestive", short: "Sug",  tone: "amber"   },
                    { value: "explicit",   label: "Explicit",   short: "Exp",  tone: "red"     },
                  ]}
                />
                <SegmentedControl
                  id="violence"
                  ariaLabel="Violence level"
                  value={violenceLevel}
                  onChange={setViolenceLevel}
                  segments={[
                    { value: "tame",    label: "Tame",    short: "Tame", tone: "neutral" },
                    { value: "violent", label: "Violent", short: "Vio",  tone: "amber"   },
                    { value: "brutal",  label: "Brutal",  short: "Bru",  tone: "red"     },
                  ]}
                />
              </div>
              </div>
            </motion.div>

            {/* Results — a reserved min-height keeps the document from
                collapsing when content swaps (loader / shorter results), so the
                toolbar can stay pinned and the hidden title doesn't pop back.
                A cursor-following spotlight overlays the grid. */}
            <div
              className="relative flex min-h-screen flex-col"
              onMouseMove={e => {
                const r = e.currentTarget.getBoundingClientRect()
                spotX.set(e.clientX - r.left)
                spotY.set(e.clientY - r.top)
              }}
              onMouseLeave={() => { spotX.set(-9999); spotY.set(-9999) }}
            >
              <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ background: spotlight }} />
              {activeMarks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted">
                  <Library className="h-12 w-12 opacity-40" />
                  <p className="text-base">Nothing in {tab === "playing" ? "Playing" : "Played"} yet</p>
                </div>
              ) : !ready ? (
                <div className="flex flex-1 items-center justify-center py-24"><Loader /></div>
              ) : loaded.items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted">
                  <Search className="h-12 w-12 opacity-40" />
                  <p className="text-base">{q ? `No matches for “${q}”` : "No results"}</p>
                </div>
              ) : (
                // Re-key on the request so the scroll-reveal replays on change.
                <div key={requestKey} className={cn(GRID_CLASS, "relative z-0")}>
                  {loaded.items.map((vn, i) => (
                    <VNCell
                      key={vn.id}
                      vn={vn}
                      index={i}
                      rating={data.ratings[markId(vn.id)] ?? 0}
                      showOriginal={showOriginal}
                      sexualLevel={sexualLevel}
                      violenceLevel={violenceLevel}
                    />
                  ))}
                </div>
              )}

              {ready && totalPages > 1 && (
                <div className="mt-10">
                  <PageNav page={page} totalPages={totalPages} onChange={goToPage} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
