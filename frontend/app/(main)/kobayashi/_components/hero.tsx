/** Hero pieces for the kobayashi showcase: the count-up stat, the per-letter
 *  magnetic title, and the GitHub action pill. Kept with the page (private
 *  `_components`) rather than the shared component tree — this is the
 *  showcase's bespoke, animation-heavy chrome. (The fanned cover collage that
 *  used to live here was replaced by the turntable — see vinyl.tsx.) */
"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { animate, motion, useMotionTemplate, useMotionValue, useSpring, useTransform, type Variants } from "motion/react"
import { ArrowUpRight } from "lucide-react"


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
  // Clear the filter once the entrance finishes: a lingering `blur(0px)` keeps
  // a filter region clipped to the (tight `leading`) letter box, which shaves
  // off descenders like the "y" tail. `transitionEnd` drops it to `none`.
  show:   { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }, transitionEnd: { filter: "none" } },
}

// The title is two stacked copies of the word. The base copy is the usual
// white gradient (with the per-letter entrance). A second green copy sits
// pixel-aligned on top and is revealed through a radial mask centred on the
// cursor — entering the title grows the mask from that exact point, so green
// liquid floods outward from where the pointer touched down, and drains back
// to it on leave. A slow vertical shimmer on the green keeps the fill "wet".
const FILL_CSS = `
@keyframes kby-fill-shimmer{0%,100%{background-position:50% 0%}50%{background-position:50% 100%}}
.kby-base-letter{background-image:linear-gradient(to bottom right,#ffffff,rgba(255,255,255,0.7))}
.kby-fill-letter{
  background-image:linear-gradient(180deg,#7df9ab 0%,#1ED760 42%,#15a347 72%,#0c8f3a 100%);
  background-size:100% 220%;
  animation:kby-fill-shimmer 3s ease-in-out infinite;
  filter:drop-shadow(0 0 10px rgba(29,185,84,0.35));
}
@media (prefers-reduced-motion: reduce){.kby-fill-letter{animation:none}}
`

// Letters shared by both copies; the base copy adds the entrance variants.
function titleLetters(name: string, klass: string, withEntrance: boolean) {
  return name.split("").map((ch, i) => (
    <motion.span
      key={i}
      aria-hidden
      variants={withEntrance ? LETTER : undefined}
      className={`${klass} inline-block bg-clip-text text-transparent`}
    >
      {ch === " " ? " " : ch}
    </motion.span>
  ))
}

export function HeroTitle({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const h1Ref = useRef<HTMLHeadingElement>(null)

  // Magnetic cursor pull on the whole title.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 150, damping: 15 })
  const y = useSpring(my, { stiffness: 150, damping: 15 })

  // Liquid-fill mask: centre (fx,fy) is the cursor's last position inside the
  // title; radius `fr` animates 0 → cover on enter, → 0 on leave. A feathered
  // inner edge (fr − 22) gives the flood a soft liquid front.
  const fx = useMotionValue(0)
  const fy = useMotionValue(0)
  const fr = useMotionValue(0)
  const frInner = useTransform(fr, v => Math.max(0, v - 22))
  const fillMask = useMotionTemplate`radial-gradient(circle at ${fx}px ${fy}px, #000 0px, #000 ${frInner}px, rgba(0,0,0,0) ${fr}px)`

  const fillCtrl = useRef<ReturnType<typeof animate> | null>(null)
  const runFill = (to: number, from?: number) => {
    fillCtrl.current?.stop()
    if (from !== undefined) fr.set(from)
    fillCtrl.current = animate(fr, to, { duration: to > 0 ? 0.65 : 0.45, ease: [0.22, 1, 0.36, 1] })
  }

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onMouseMove={e => {
        const r = ref.current!.getBoundingClientRect()
        mx.set((e.clientX - (r.left + r.width / 2)) * 0.06)
        my.set((e.clientY - (r.top + r.height / 2)) * 0.06)
        const h = h1Ref.current
        if (h) {
          const hr = h.getBoundingClientRect()
          fx.set(e.clientX - hr.left)
          fy.set(e.clientY - hr.top)
        }
      }}
      onMouseEnter={e => {
        const h = h1Ref.current
        if (!h) return
        const hr = h.getBoundingClientRect()
        fx.set(e.clientX - hr.left)
        fy.set(e.clientY - hr.top)
        // Reach the farthest corner from the entry point so the flood always
        // covers the whole word.
        const maxR = Math.max(
          Math.hypot(e.clientX - hr.left, e.clientY - hr.top),
          Math.hypot(hr.right - e.clientX, e.clientY - hr.top),
          Math.hypot(e.clientX - hr.left, hr.bottom - e.clientY),
          Math.hypot(hr.right - e.clientX, hr.bottom - e.clientY),
        )
        runFill(maxR + 24, 0)
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); runFill(0) }}
      className="mt-2 inline-block"
    >
      <style>{FILL_CSS}</style>
      {/* The name links home; `w-fit` keeps the hit area tight to the text. */}
      <Link href="/" aria-label="Go to home">
      <motion.h1
        ref={h1Ref}
        aria-label={name}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
        className="relative flex w-fit pb-[0.18em] text-6xl font-black leading-[1.15] tracking-tight drop-shadow-sm sm:text-7xl lg:text-8xl xl:text-9xl"
      >
        {/* Base white copy (carries the entrance stagger) */}
        {titleLetters(name, "kby-base-letter", true)}
        {/* Green liquid copy, revealed through the cursor-anchored mask */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex"
          style={{ maskImage: fillMask, WebkitMaskImage: fillMask }}
        >
          {titleLetters(name, "kby-fill-letter", false)}
        </motion.span>
      </motion.h1>
      </Link>
    </motion.div>
  )
}


/* ─── GitHub link ──────────────────────────────────────────────────────────── */

export const GITHUB_URL = "https://github.com/Kobayashi2003/VisualNovelDatabase"

// lucide dropped its brand icons, so the GitHub mark is inlined.
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

/** Quiet inline GitHub link — sits inside the hero's stats line as just
 *  another metadata item rather than shouting as a standalone button. */
export function GitHubLink() {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="View the source on GitHub"
      className="group inline-flex items-baseline gap-1 align-baseline text-muted transition-colors hover:text-accent"
    >
      <GitHubMark className="h-3 w-3 self-center fill-current opacity-80 transition-opacity group-hover:opacity-100" />
      <span className="font-medium">GitHub</span>
      <ArrowUpRight className="h-3 w-3 -translate-x-0.5 self-center opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-70" />
    </a>
  )
}
