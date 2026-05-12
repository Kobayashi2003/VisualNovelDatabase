"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { createPortal } from "react-dom"
import { Eye, EyeOff, ExternalLink, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import { useSearchContext } from "@/context/SearchContext"
import { ENUMS } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import type { VN, Category } from "@/lib/types"

// ─── blur helper (mirrors CardsGrid logic) ────────────────────────────────────
function shouldBlur(
  sexual: number, violence: number,
  sexualLevel: string, violenceLevel: string
): boolean {
  const isSexual = (sexualLevel === "safe" && sexual > 0.5) || (sexualLevel === "suggestive" && sexual > 1.5)
  const isViolent = (violenceLevel === "tame" && violence > 0.5) || (violenceLevel === "violent" && violence > 1.5)
  return isSexual || isViolent
}

// ─── small info row ───────────────────────────────────────────────────────────
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-xs text-white/90 flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-white/10 text-white/80", className)}>
      {children}
    </span>
  )
}

// ─── Collection button ────────────────────────────────────────────────────────
function CollectionButton({ vnId }: { vnId: string }) {
  const { user } = useUserContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [markedCatIds, setMarkedCatIds] = useState<Set<number>>(new Set())
  const markId = parseInt(vnId.replace(/^v/, ""))

  const refresh = useCallback(async () => {
    const cats = await api.category.get("vn")
    setCategories(cats)
    const marked = new Set<number>()
    for (const c of cats) {
      if (c.marks.some(m => m.id === markId)) marked.add(c.id)
    }
    setMarkedCatIds(marked)
  }, [markId])

  useEffect(() => {
    if (user) refresh()
  }, [user, refresh])

  if (!user) return null

  const isAnyMarked = markedCatIds.size > 0

  const toggle = async (catId: number) => {
    if (markedCatIds.has(catId)) {
      await api.category.removeMark("vn", catId, markId)
    } else {
      await api.category.addMark("vn", catId, markId)
    }
    await refresh()
  }

  return (
    <div className="relative mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full py-2 rounded-lg text-sm font-semibold transition-colors",
          isAnyMarked
            ? "bg-accent text-black hover:bg-accent/80"
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {isAnyMarked ? "In Collection ✓" : "Add to Collection"}
      </button>

      {open && categories.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-elevated border border-white/10 rounded-lg shadow-lg overflow-hidden">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              <span className="text-white/90">{cat.category_name}</span>
              {markedCatIds.has(cat.id) && <span className="text-accent text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
interface VNInfoPanelProps {
  vn: VN
  sexualLevel: string
  violenceLevel: string
  mobile?: boolean
}

export function VNInfoPanel({ vn, sexualLevel, violenceLevel, mobile }: VNInfoPanelProps) {
  const [ratingHidden, setRatingHidden] = useState(true)
  const [coverOpen, setCoverOpen] = useState(false)
  const [coverMounted, setCoverMounted] = useState(false)
  const blur = vn.image ? shouldBlur(vn.image.sexual, vn.image.violence, sexualLevel, violenceLevel) : false
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => { setCoverMounted(true) }, [])

  const DEVSTATUS = ENUMS.DEVSTATUS as Record<number, string>
  const PLATFORM = ENUMS.PLATFORM as Record<string, string>
  const LANGUAGE = ENUMS.LANGUAGE as Record<string, string>
  const LENGTH = ENUMS.LENGTH as Record<number, string>
  const RELATION = ENUMS.RELATION as Record<string, string>
  const LANG_ICON = ICON.LANGUAGE as Record<string, string>
  const PLAT_ICON = ICON.PLATFORM as Record<string, string>
  const { showOriginal } = useSearchContext()

  const devstatusColor =
    vn.devstatus === 0 ? "bg-green-500/20 text-green-400" :
    vn.devstatus === 1 ? "bg-yellow-500/20 text-yellow-400" :
    "bg-red-500/20 text-red-400"

  // Group relations by type
  const relationGroups = vn.relations.reduce<Record<string, typeof vn.relations>>((acc, r) => {
    const key = RELATION[r.relation] ?? r.relation
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const infoContent = (
    <div className="flex flex-col gap-0">
      {/* Cover */}
      <div
        className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated mb-4 cursor-pointer group"
        onClick={() => vn.image && setCoverOpen(true)}
      >
        {vn.image ? (
          <>
            <Image
              src={vn.image.thumbnail || vn.image.url}
              alt={vn.title}
              fill
              className={cn(
                "object-cover transition-all duration-300",
                !imgLoaded && "opacity-0",
                blur && "blur-xl scale-105"
              )}
              onLoad={() => setImgLoaded(true)}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs bg-black/50 px-2 py-1 rounded">
                Click to enlarge
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">No cover</div>
        )}
      </div>

      {/* Cover lightbox */}
      {coverMounted && coverOpen && vn.image && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setCoverOpen(false)}
        >
          <button
            onClick={() => setCoverOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={vn.image.url}
            alt={vn.title}
            className={cn(
              "max-w-[90vw] max-h-[90vh] object-contain rounded-lg",
              blur && "blur-xl"
            )}
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* Rating */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          {vn.average != null ? (
            <span className={cn(
              "text-2xl font-bold transition-all duration-200",
              ratingHidden ? "blur-md select-none" : ""
            )}>
              {vn.average.toFixed(2)}
            </span>
          ) : (
            <span className="text-muted text-sm">No rating</span>
          )}
          {vn.average != null && (
            <span className="text-xs text-muted">/ 100</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {vn.votecount > 0 && (
            <span className={cn("text-xs text-muted transition-all duration-200", ratingHidden ? "blur-md select-none" : "")}>
              {vn.votecount.toLocaleString()} votes
            </span>
          )}
          <button
            onClick={() => setRatingHidden(h => !h)}
            className="p-1 rounded text-muted hover:text-white transition-colors"
            title={ratingHidden ? "Show rating" : "Hide rating"}
          >
            {ratingHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Devstatus */}
      <div className="mb-3 px-1">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", devstatusColor)}>
          {DEVSTATUS[vn.devstatus] ?? "Unknown"}
        </span>
      </div>

      {/* Info rows */}
      <div className="rounded-lg bg-surface border border-white/5 px-3 py-1 mb-3">
        {vn.released && (
          <InfoRow label="Released">{vn.released}</InfoRow>
        )}
        {vn.length != null && (
          <InfoRow label="Length">
            {LENGTH[vn.length] ?? String(vn.length)}
            {vn.length_minutes != null && (
              <span className="text-muted">
                &nbsp;({Math.floor(vn.length_minutes / 60)}h{vn.length_minutes % 60}m
                {vn.length_votes > 0 && `, ${vn.length_votes} votes`})
              </span>
            )}
          </InfoRow>
        )}
        {vn.developers.length > 0 && (
          <InfoRow label="Developer">
            {vn.developers.map(d => (
              <Link key={d.id} href={`/${d.id}`} className="hover:text-accent transition-colors">
                {showOriginal && d.original ? d.original : d.name}
              </Link>
            ))}
          </InfoRow>
        )}
        {vn.publishers.length > 0 && (
          <InfoRow label="Publisher">
            <div className="flex flex-col gap-1 w-full">
              {vn.publishers.map(pub => (
                <Link key={pub.id} href={`/${pub.id}`}
                  className="flex items-center gap-1.5 hover:text-accent transition-colors">
                  <div className="flex gap-0.5 shrink-0">
                    {pub.languages.slice(0, 3).map(l =>
                      LANG_ICON[l] ? <span key={l} className={LANG_ICON[l]} /> : null
                    )}
                  </div>
                  <span className="truncate">{showOriginal && pub.original ? pub.original : pub.name}</span>
                </Link>
              ))}
            </div>
          </InfoRow>
        )}
        {vn.platforms.length > 0 && (
          <InfoRow label="Platforms">
            <div className="flex flex-wrap gap-1.5">
              {vn.platforms.map(p => (
                PLAT_ICON[p]
                  ? <span key={p} className={PLAT_ICON[p]} title={PLATFORM[p] ?? p} />
                  : <Badge key={p}>{PLATFORM[p] ?? p}</Badge>
              ))}
            </div>
          </InfoRow>
        )}
        {vn.languages.length > 0 && (
          <InfoRow label="Languages">
            {vn.languages.map(l => (
              <Badge
                key={l}
                className={cn(
                  "gap-1",
                  l === vn.olang && "ring-1 ring-accent text-white bg-accent/10"
                )}
              >
                {LANG_ICON[l] && <span className={LANG_ICON[l]} />}
                {LANGUAGE[l] ?? l}
              </Badge>
            ))}
          </InfoRow>
        )}
        {vn.aliases.length > 0 && (
          <InfoRow label="Aliases">
            <span className="text-white/70">{vn.aliases.join(", ")}</span>
          </InfoRow>
        )}
      </div>

      {/* Relations */}
      {Object.keys(relationGroups).length > 0 && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-2 mb-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Relations</p>
          {Object.entries(relationGroups).map(([relType, items]) => (
            <div key={relType} className="mb-2 last:mb-0">
              <p className="text-xs text-muted mb-1">{relType}</p>
              <div className="flex flex-col gap-0.5">
                {items.map(r => (
                  <Link key={r.id} href={`/${r.id}`} className="text-xs text-white/80 hover:text-accent transition-colors truncate">
                    {r.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* External links */}
      {vn.extlinks.length > 0 && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-2 mb-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Links</p>
          <div className="flex flex-wrap gap-1.5">
            {vn.extlinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-white/70 hover:text-accent transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <CollectionButton vnId={vn.id} />
    </div>
  )

  if (mobile) {
    return (
      <div className="flex gap-4">
        <div className="w-32 shrink-0">
          <div className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-elevated">
            {vn.image ? (
              <Image
                src={vn.image.thumbnail || vn.image.url}
                alt={vn.title}
                fill
                className={cn("object-cover", blur && "blur-xl scale-105")}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">No cover</div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1 pt-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-lg font-bold transition-all", ratingHidden ? "blur-md select-none" : "")}>
              {vn.average != null ? vn.average.toFixed(2) : "N/A"}
            </span>
            <span className="text-xs text-muted">/ 100</span>
            <button onClick={() => setRatingHidden(h => !h)} className="p-1 text-muted hover:text-white">
              {ratingHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium w-fit", devstatusColor)}>
            {DEVSTATUS[vn.devstatus]}
          </span>
          {vn.released && <span className="text-xs text-muted">{vn.released}</span>}
          {vn.developers.length > 0 && (
            <span className="text-xs text-white/70">{vn.developers.map(d => d.name).join(", ")}</span>
          )}
          <CollectionButton vnId={vn.id} />
        </div>
      </div>
    )
  }

  return infoContent
}
