"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { VN } from "@/lib/types"

type VNTag = VN["tags"][number]

const CATEGORY_ORDER = ["cont", "ero", "tech"] as const
const CATEGORY_LABEL: Record<string, string> = {
  cont: "Content",
  ero: "Sexual Content",
  tech: "Technical",
}

interface VNTagsProps {
  tags: VNTag[]
  sexualLevel: string
}

export function VNTags({ tags, sexualLevel }: VNTagsProps) {
  const [spoilerLevel, setSpoilerLevel] = useState<0 | 1 | 2>(0)

  // Group by category, sort by rating desc within each group
  const grouped = CATEGORY_ORDER.reduce<Record<string, VNTag[]>>((acc, cat) => {
    acc[cat] = tags
      .filter(t => t.category === cat)
      .sort((a, b) => b.rating - a.rating)
    return acc
  }, {})

  const hasMinorSpoilers = tags.some(t => t.spoiler === 1)
  const hasMajorSpoilers = tags.some(t => t.spoiler === 2)
  const hasAnySpoilers = hasMinorSpoilers || hasMajorSpoilers

  function nextSpoilerLevel(): 0 | 1 | 2 {
    if (spoilerLevel === 0) return hasMinorSpoilers ? 1 : 2
    if (spoilerLevel === 1) return hasMajorSpoilers ? 2 : 0
    return 0
  }

  function spoilerButtonLabel(): string {
    if (spoilerLevel === 0) return "Show minor spoilers"
    if (spoilerLevel === 1) return hasMajorSpoilers ? "Show major spoilers" : "Hide spoilers"
    return "Hide spoilers"
  }

  return (
    <div className="flex flex-col gap-4">
      {hasAnySpoilers && (
        <button
          onClick={() => setSpoilerLevel(nextSpoilerLevel())}
          className="text-xs text-muted hover:text-white transition-colors self-start"
        >
          {spoilerButtonLabel()}
        </button>
      )}

      {CATEGORY_ORDER.map(cat => {
        const catTags = grouped[cat] ?? []
        if (catTags.length === 0) return null

        // Hide ero group unless sexualLevel is explicit
        if (cat === "ero" && sexualLevel !== "explicit") {
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                {CATEGORY_LABEL[cat]}
              </p>
              <p className="text-xs text-muted italic">
                Set Sexual filter to Explicit to view sexual content tags.
              </p>
            </div>
          )
        }

        // Filter by current spoiler level
        const visibleTags = catTags.filter(t => t.spoiler <= spoilerLevel)
        const hiddenMinor = catTags.filter(t => t.spoiler === 1 && spoilerLevel < 1).length
        const hiddenMajor = catTags.filter(t => t.spoiler === 2 && spoilerLevel < 2).length

        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              {CATEGORY_LABEL[cat]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map(tag => (
                <Link
                  key={tag.id}
                  href={`/${tag.id}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors",
                    tag.lie
                      ? "bg-white/5 text-muted line-through hover:bg-white/10"
                      : "bg-white/10 text-white/90 hover:bg-white/20",
                    tag.spoiler === 1 && "border border-yellow-500/30",
                    tag.spoiler === 2 && "border border-orange-500/40"
                  )}
                >
                  <span>{tag.name}</span>
                  <span className={cn(
                    "font-mono",
                    tag.rating >= 2.5 ? "text-accent" : "text-muted"
                  )}>
                    {tag.rating.toFixed(1)}
                  </span>
                </Link>
              ))}

              {/* Minor spoiler hint */}
              {hiddenMinor > 0 && (
                <button
                  onClick={() => setSpoilerLevel(1)}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors border border-yellow-500/20"
                >
                  +{hiddenMinor} minor spoiler{hiddenMinor !== 1 ? "s" : ""}
                </button>
              )}

              {/* Major spoiler hint */}
              {hiddenMajor > 0 && (
                <button
                  onClick={() => setSpoilerLevel(2)}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
                >
                  +{hiddenMajor} major spoiler{hiddenMajor !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
