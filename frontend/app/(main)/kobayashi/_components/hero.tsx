/** Hero pieces for the kobayashi showcase: the count-up stat, the per-letter
 *  magnetic title, and the fanned cover collage that reshuffles on click. Kept
 *  with the page (private `_components`) rather than the shared component tree —
 *  this is the showcase's bespoke, animation-heavy chrome. */
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform, type Variants, type Transition } from "motion/react"

import { cn } from "@/lib/utils"


export interface Cover { id: string; url: string; blur: boolean }

// Max number of covers fanned out behind the title.
const COLLAGE_SIZE = 5


/* ─── Count-up stat ────────────────────────────────────────────────────────── */

// Animated count-up used for the hero stats.
export function Counter({ value }: { value: number }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, v => Math.round(v).toString())
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [value, mv])
  return <motion.span>{text}</motion.span>
}


/* ─── Hero title: per-letter reveal + magnetic cursor pull ─────────────────── */

const LETTER: Variants = {
  hidden: { opacity: 0, y: "0.5em", filter: "blur(8px)" },
  show:   { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export function HeroTitle({ name }: { name: string }) {
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
            {ch === " " ? " " : ch}
          </motion.span>
        ))}
      </motion.h1>
      </Link>
    </motion.div>
  )
}


/* ─── Hero cover collage (fanned covers; click to shuffle) ─────────────────── */

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

export function CoverCollage({ covers }: { covers: Cover[] }) {
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
