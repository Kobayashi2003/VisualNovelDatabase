/** Result-area pieces for the kobayashi showcase: the tilting cover card and its
 *  scroll-reveal cell, the Spotify-style custom cursor, and the small loading /
 *  error states. All private to the showcase.
 *
 *  Cards are pure track pickers — this page doesn't link into detail pages.
 *  Cards WITH music are vivid and clickable (the whole cover toggles their
 *  theme; the loaded one carries an accent ring + live equalizer); cards
 *  without music are dimmed, desaturated and inert, so the playable library
 *  reads at a glance. */
"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring, useTransform, type Variants } from "motion/react"
import { Star } from "lucide-react"

import { cn, shouldBlur } from "@/lib/utils"
import { displayTitle, displayName } from "@/lib/original"
import type { VN_Small, SexualLevel, ViolenceLevel } from "@/lib/types"

import { EqBars } from "./cassette"


/* ─── Small states ─────────────────────────────────────────────────────────── */

// Bouncing-dot loader in the accent colour.
export function Loader() {
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

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="text-sm text-red-400">{message}</p>
    </div>
  )
}


/* ─── Cover card ───────────────────────────────────────────────────────────── */

// Personal-rating pill drawn over a cover's corner.
function RatingBadge({ value }: { value: number }) {
  return (
    <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 rounded-full bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-yellow-400 backdrop-blur-sm">
      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
      {value}
    </div>
  )
}

// Cover card. Playable: the whole cover is a button that toggles the VN's
// theme — vivid art, cursor tilt, hover lift, and an accent ring + live
// equalizer once loaded. Not playable: dimmed, desaturated, inert — these
// titles simply have no tape in the library.
function VNCard({ vn, rating, showOriginal, sexualLevel, violenceLevel, playable, selected, playing, onToggle }: {
  vn: VN_Small
  rating: number
  showOriginal: boolean
  sexualLevel: SexualLevel
  violenceLevel: ViolenceLevel
  playable: boolean
  selected: boolean
  playing: boolean
  onToggle: () => void
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

  const cover = url ? (
    // The cover carries its own rounding: a composited ancestor transform
    // (the 3D tilt) can momentarily defeat the parent's overflow clip in
    // Chromium, flashing square corners on hover enter/leave.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={title}
      loading="lazy"
      draggable={false}
      className={cn(
        "h-full w-full rounded-xl object-cover",
        playable && "transition-transform duration-500 group-hover:scale-[1.06]",
        blur && (playable ? "blur-lg group-hover:blur-none" : "blur-lg"),
      )}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-2xl text-muted/40">♥</div>
  )

  const caption = (developer || year) && (
    <p className="mt-2 line-clamp-1 px-0.5 text-xs text-muted">{[developer, year].filter(Boolean).join(" · ")}</p>
  )

  if (!playable) {
    return (
      <div aria-disabled className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-elevated opacity-40 saturate-[0.25] ring-1 ring-white/5">
          {cover}
          {rating > 0 && <RatingBadge value={rating} />}
        </div>
        <div className="opacity-50">{caption}</div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={selected && playing ? `Pause ${title}` : `Play ${title}`}
      aria-pressed={selected && playing}
      title={selected && playing ? "Pause" : "Play theme"}
      data-cursor="pointer"
      className="group block w-full cursor-pointer text-left"
      style={{ perspective: 800 }}
    >
      <motion.div
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect()
          px.set((e.clientX - r.left) / r.width - 0.5)
          py.set((e.clientY - r.top) / r.height - 0.5)
        }}
        onMouseLeave={() => { px.set(0); py.set(0) }}
        style={{ rotateX, rotateY }}
        className={cn(
          "relative aspect-[3/4] rounded-xl transition-shadow duration-300",
          // Outset lift shadow lives on this (un-clipped) tilt element.
          selected
            ? "shadow-xl shadow-accent/20"
            : "group-hover:shadow-2xl group-hover:shadow-black/60",
        )}
      >
        {/* Rounded art frame clipped with clip-path rather than overflow-hidden:
            the 3D tilt above is composited, and in Chromium that momentarily
            defeats an overflow clip — flashing square corners, most visible
            behind the accent ring. clip-path holds the rounding through the
            transform. */}
        <div className="absolute inset-0 rounded-xl bg-elevated [clip-path:inset(0_round_0.75rem)]">
          {cover}
          {rating > 0 && <RatingBadge value={rating} />}
          {/* Live equalizer on the loaded track */}
          {selected && (
            <div className="absolute right-1.5 top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/75 px-1 backdrop-blur-sm">
              <EqBars playing={playing} className="h-2.5 w-3.5" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-linear-to-t from-black/80 to-transparent p-3 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{title}</p>
            <p className="mt-0.5 text-[10px] font-medium text-accent">
              {selected && playing ? "Pause" : "Play theme"}
            </p>
          </div>
          {/* Ring as a self-rounded inset overlay so it stays inside the clip
              and never squares off during the tilt. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-20 rounded-xl ring-inset transition-[box-shadow]",
              selected ? "ring-2 ring-accent" : "ring-1 ring-white/10 group-hover:ring-accent/60",
            )}
          />
        </div>
      </motion.div>
      {caption}
    </button>
  )
}

// `custom` is the card's index; the column-based delay gives each row a quick
// left-to-right cascade as it scrolls into view.
const cellVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(12px)" },
  show: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: (i % 6) * 0.05 },
  }),
}

export function VNCell({
  vn, rating, index, showOriginal, sexualLevel, violenceLevel,
  playable = false, selected = false, playing = false, onToggle,
}: {
  vn: VN_Small
  rating: number
  index: number
  showOriginal: boolean
  sexualLevel: SexualLevel
  violenceLevel: ViolenceLevel
  playable?: boolean
  selected?: boolean
  playing?: boolean
  onToggle?: () => void
}) {
  return (
    <motion.div
      custom={index}
      variants={cellVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      whileHover={playable ? { y: -4 } : undefined}
      className="relative"
    >
      <VNCard
        vn={vn} rating={rating} showOriginal={showOriginal}
        sexualLevel={sexualLevel} violenceLevel={violenceLevel}
        playable={playable} selected={selected} playing={playing}
        onToggle={onToggle ?? (() => {})}
      />
    </motion.div>
  )
}


/* ─── Custom cursor ────────────────────────────────────────────────────────── */

// A precise accent dot + a spring-trailing ring. The ring swells and turns
// accent-green over interactive elements; both react to clicks. Only on fine
// pointers, and disabled under reduced-motion (native cursor stays). The native
// cursor is hidden (page-scoped) once the pointer first moves.
export function CustomCursor() {
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
