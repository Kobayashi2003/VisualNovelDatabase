"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import type { Tag, VN_Small, Category } from "@/lib/types"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { VNDescription } from "@/components/vn/VNDescription"
import { VNsCardsGrid } from "@/components/card/CardsGrid"
import { PaginationButtons } from "@/components/button/PaginationButtons"

const PAGE_LIMIT = 24

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  cont: "Content",
  ero: "Sexual Content",
  tech: "Technical",
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-xs text-white/90 flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

// ─── Collection button ────────────────────────────────────────────────────────
function CollectionButton({ tagId }: { tagId: string }) {
  const { user } = useUserContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [markedCatIds, setMarkedCatIds] = useState<Set<number>>(new Set())
  const markId = parseInt(tagId.replace(/^g/, ""), 10)

  const refresh = useCallback(async () => {
    const cats = await api.category.get("tag")
    setCategories(cats)
    const marked = new Set<number>()
    for (const c of cats) {
      if (c.marks.some(m => m.id === markId)) marked.add(c.id)
    }
    setMarkedCatIds(marked)
  }, [markId])

  useEffect(() => { if (user) refresh() }, [user, refresh])

  if (!user) return null
  const isAnyMarked = markedCatIds.size > 0

  const toggle = async (catId: number) => {
    if (markedCatIds.has(catId)) {
      await api.category.removeMark("tag", catId, markId)
    } else {
      await api.category.addMark("tag", catId, markId)
    }
    await refresh()
  }

  return (
    <div className="relative mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full py-2 rounded-lg text-sm font-semibold transition-colors",
          isAnyMarked ? "bg-accent text-black hover:bg-accent/80" : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {isAnyMarked ? "In Collection ✓" : "Add to Collection"}
      </button>
      {open && categories.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-elevated border border-white/10 rounded-lg shadow-lg overflow-hidden">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => toggle(cat.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/10 transition-colors">
              <span className="text-white/90">{cat.category_name}</span>
              {markedCatIds.has(cat.id) && <span className="text-accent text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar info panel ───────────────────────────────────────────────────────
function TagInfoPanel({ tag }: { tag: Tag }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
        {tag.category && (
          <InfoRow label="Category">{CATEGORY_LABEL[tag.category] ?? tag.category}</InfoRow>
        )}
        <InfoRow label="Visual Novels">{tag.vn_count.toLocaleString()}</InfoRow>
        {tag.aliases.length > 0 && (
          <InfoRow label="Aliases">
            <div className="flex flex-col gap-1 w-full">
              {tag.aliases.map((alias, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80 w-full">
                  {alias}
                </span>
              ))}
            </div>
          </InfoRow>
        )}
      </div>
      <CollectionButton tagId={tag.id} />
    </div>
  )
}

// ─── VNs section ─────────────────────────────────────────────────────────────
interface TagVNsProps {
  tagId: string
  sexualLevel: "safe" | "suggestive" | "explicit"
  violenceLevel: "tame" | "violent" | "brutal"
}

function TagVNs({ tagId, sexualLevel, violenceLevel }: TagVNsProps) {
  const [vns, setVns] = useState<VN_Small[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.small.vn({ tag: tagId, sort: "rating", reverse: true, limit: PAGE_LIMIT, page })
      .then(res => {
        if (cancelled) return
        setVns(res.results)
        setTotalPages(Math.ceil(res.count / PAGE_LIMIT))
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [tagId, page])

  if (loading) return <Loading message="Loading visual novels..." />
  if (error) return <ErrorStatus message={error} />
  if (vns.length === 0) return <p className="text-xs text-muted italic">No visual novels listed.</p>

  return (
    <div className="flex flex-col gap-4">
      <VNsCardsGrid
        vns={vns}
        layout="grid"
        cardType="image"
        sexualLevel={sexualLevel}
        violenceLevel={violenceLevel}
      />
      <PaginationButtons totalPages={totalPages} currentPage={page} onPageChange={p => { setPage(p); }} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface TagDetailPageProps {
  id: number
}

export function TagDetailPage({ id }: TagDetailPageProps) {
  const [tag, setTag] = useState<Tag | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sexualLevel, setSexualLevel] = useState<"safe" | "suggestive" | "explicit">("safe")
  const [violenceLevel, setViolenceLevel] = useState<"tame" | "violent" | "brutal">("tame")

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    setTag(null)

    api.by_id.tag(id, {}, ctrl.signal)
      .then(data => { if (!ctrl.signal.aborted) setTag(data) })
      .catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })

    return () => ctrl.abort()
  }, [id])

  if (loading) return (
    <main className="flex-1 flex items-center justify-center">
      <Loading message="Loading tag..." />
    </main>
  )

  if (error || !tag) return (
    <main className="flex-1 flex items-center justify-center">
      <ErrorStatus message={error || "Tag not found"} />
    </main>
  )

  return (
    <main
      className="container mx-auto flex gap-6 px-4 overflow-hidden"
      style={{ height: "calc(100vh - var(--header-h, 4rem))" }}
    >
            <aside className="w-56 xl:w-64 shrink-0 overflow-y-auto py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <SexualLevelSelector
              sexualLevel={sexualLevel}
              setSexualLevel={v => setSexualLevel(v as "safe" | "suggestive" | "explicit")}
            />
            <ViolenceLevelSelector
              violenceLevel={violenceLevel}
              setViolenceLevel={v => setViolenceLevel(v as "tame" | "violent" | "brutal")}
            />
          </div>
          <TagInfoPanel tag={tag} />
        </div>
      </aside>

            <div className="flex-1 min-w-0 overflow-y-auto py-4 pb-12">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{tag.name}</h1>
            {tag.category && (
              <p className="text-sm text-muted mt-0.5">{CATEGORY_LABEL[tag.category] ?? tag.category}</p>
            )}
          </div>

          {tag.description && (
            <Section title="Description">
              <VNDescription text={tag.description} />
            </Section>
          )}

          <Section title={`Visual Novels (${tag.vn_count.toLocaleString()})`}>
            <TagVNs tagId={tag.id} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
          </Section>
        </div>
      </div>
    </main>
  )
}
