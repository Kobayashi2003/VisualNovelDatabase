/** Per-collection horizontal shelf for the user-collections page's "shelf" view.
 *
 *  Each row fetches its own first-N marks (sorted by `marked_at` desc),
 *  renders a Spotify/Netflix-style horizontal scroller, and exposes a
 *  "See all" link that takes the user to the same collection in grid view. */
"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useSearchContext } from "@/context/SearchContext"
import type { Category, Mark, SexualLevel, ViolenceLevel } from "@/lib/types"

import {
  GenImageCard, CollectionWrapper,
  adapterForType, supportsImageForType,
  type CollectionCardProps,
} from "./CardsGrid"
import { TextCard } from "./TextCard"


interface CardsShelfRowProps extends CollectionCardProps {
  type: string
  category: Category
  /** Max items rendered in the strip; the "See all" link covers the rest. */
  limit?: number
  sexualLevel?: SexualLevel
  violenceLevel?: ViolenceLevel
  onSeeAll: (categoryId: number) => void
}

const CARD_WIDTH_CLS = "w-32 sm:w-36 md:w-40 shrink-0 snap-start"
const SCROLLBAR_HIDE = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"

export function CardsShelfRow({
  type, category, limit = 20,
  sexualLevel = "safe", violenceLevel = "tame",
  onRemove, onMove, markedAtMap, onSeeAll,
}: CardsShelfRowProps) {
  const { showOriginal } = useSearchContext()

  const [items, setItems]     = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  // Recent-first slice of the category's marks — the canonical card order.
  const recentMarks = useMemo<Mark[]>(
    () => [...category.marks]
      .sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime())
      .slice(0, limit),
    [category.marks, limit],
  )
  // A value-comparable dep: `setCategories` hands back fresh array identities on
  // every refresh, so keying the fetch on the joined IDs stops sibling shelves
  // from refetching when only some *other* shelf's marks changed.
  const idsKey = recentMarks.map(m => m.id).join(",")

  useEffect(() => {
    if (recentMarks.length === 0) {
      setItems([])
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    const ids = recentMarks.map(m => m.id)
    api.small.byIdsForType(type, ids, { limit }, ctrl.signal)
      .then(data => {
        // Re-order results to match `ids` so the strip stays `marked_at desc`.
        const idMap = new Map(data.results.map((item: { id: string }) => [
          parseInt(item.id.replace(/^[a-z]+/, "")),
          item,
        ]))
        setItems(ids.map(id => idMap.get(id)).filter(Boolean))
      })
      .catch(e => {
        if (e instanceof Error && e.name !== "AbortError") setItems([])
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, idsKey, limit])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [canLeft, setCanLeft]   = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState, items.length])

  const scrollByDir = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: "smooth" })
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  // A shelf that resolved to nothing (e.g. all its marks 404'd) renders nothing.
  if (!loading && items.length === 0) return null

  const useImageCard = supportsImageForType(type)
  const adapter      = adapterForType(type)
  const cards = items.map(it => adapter(it, showOriginal))

  return (
    <section
      role="region"
      aria-label={category.category_name}
      className="mb-6"
    >
      <div className="flex items-baseline justify-between mb-2 px-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-white truncate">
            {category.category_name}
          </h2>
          <span className="text-muted text-sm tabular-nums shrink-0">
            {category.marks.length}
          </span>
        </div>
        <button
          onClick={() => onSeeAll(category.id)}
          className="text-sm text-muted hover:text-white transition-colors shrink-0"
        >
          See all →
        </button>
      </div>

      {/* Strip + arrows */}
      <div className="relative group/shelf">
        <div
          ref={scrollRef}
          className={cn(
            "flex gap-2 sm:gap-3 overflow-x-auto snap-x scroll-smooth pb-2",
            SCROLLBAR_HIDE,
          )}
        >
          {loading
            ? Array.from({ length: Math.min(recentMarks.length || 6, 8) }).map((_, i) => (
                <div key={i} className={cn(CARD_WIDTH_CLS)}>
                  <div className={cn(
                    "rounded-lg bg-elevated animate-pulse",
                    useImageCard ? "aspect-square" : "h-16",
                  )} />
                  <div className="mt-2 h-3 rounded bg-elevated/70 animate-pulse" />
                </div>
              ))
            : cards.map(card => (
                <div key={card.id} className={cn(CARD_WIDTH_CLS)}>
                  <CollectionWrapper
                    id={card.id}
                    onRemove={onRemove}
                    onMove={onMove}
                    markedAtMap={markedAtMap}
                  >
                    {useImageCard ? (
                      <GenImageCard
                        image={card.image}
                        title={card.title}
                        msgs={card.msgs}
                        link={card.link}
                        sexualLevel={sexualLevel}
                        violenceLevel={violenceLevel}
                        layout="grid"
                      />
                    ) : (
                      <TextCard
                        title={card.title}
                        msgs={card.msgs}
                        link={card.link}
                        layout="grid"
                      />
                    )}
                  </CollectionWrapper>
                </div>
              ))}
        </div>

        {canLeft && (
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            aria-label="Scroll left"
            className={cn(
              "hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2",
              "w-9 h-9 items-center justify-center rounded-full",
              "bg-black/70 backdrop-blur-sm text-white",
              "border border-white/10 shadow-lg",
              "opacity-0 group-hover/shelf:opacity-100 transition-opacity",
              "hover:bg-black/90",
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            aria-label="Scroll right"
            className={cn(
              "hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
              "w-9 h-9 items-center justify-center rounded-full",
              "bg-black/70 backdrop-blur-sm text-white",
              "border border-white/10 shadow-lg",
              "opacity-0 group-hover/shelf:opacity-100 transition-opacity",
              "hover:bg-black/90",
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  )
}
