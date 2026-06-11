/** Result-area pieces for the kobayashi showcase: the tilting cover card and its
 *  scroll-reveal cell, the Spotify-style custom cursor, and the small loading /
 *  error states. All private to the showcase. */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, useMotionValue, useSpring, useTransform, type Variants } from "motion/react"
import { Star } from "lucide-react"

import { cn, shouldBlur } from "@/lib/utils"
import { displayTitle, displayName } from "@/lib/original"
import type { VN_Small, SexualLevel, ViolenceLevel } from "@/lib/types"


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
