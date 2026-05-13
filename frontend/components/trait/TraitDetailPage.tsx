"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import type { Trait, Character_Small, Category } from "@/lib/types"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { VNDescription } from "@/components/vn/VNDescription"
import { CharactersCardsGrid } from "@/components/card/CardsGrid"
import { PaginationButtons } from "@/components/button/PaginationButtons"

const PAGE_LIMIT = 24

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
function CollectionButton({ traitId }: { traitId: string }) {
  const { user } = useUserContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [markedCatIds, setMarkedCatIds] = useState<Set<number>>(new Set())
  const markId = parseInt(traitId.replace(/^i/, ""), 10)

  const refresh = useCallback(async () => {
    const cats = await api.category.get("trait")
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
      await api.category.removeMark("trait", catId, markId)
    } else {
      await api.category.addMark("trait", catId, markId)
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
function TraitInfoPanel({ trait }: { trait: Trait }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
        {trait.group_name && (
          <InfoRow label="Group">{trait.group_name}</InfoRow>
        )}
        <InfoRow label="Characters">{trait.char_count.toLocaleString()}</InfoRow>
        {trait.aliases.length > 0 && (
          <InfoRow label="Aliases">
            <div className="flex flex-col gap-1 w-full">
              {trait.aliases.map((alias, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80 w-full">
                  {alias}
                </span>
              ))}
            </div>
          </InfoRow>
        )}
      </div>
      <CollectionButton traitId={trait.id} />
    </div>
  )
}

// ─── Characters section ───────────────────────────────────────────────────────
interface TraitCharactersProps {
  traitId: string
  sexualLevel: "safe" | "suggestive" | "explicit"
  violenceLevel: "tame" | "violent" | "brutal"
}

function TraitCharacters({ traitId, sexualLevel, violenceLevel }: TraitCharactersProps) {
  const [characters, setCharacters] = useState<Character_Small[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.small.character({ trait: traitId, limit: PAGE_LIMIT, page })
      .then(res => {
        if (cancelled) return
        setCharacters(res.results)
        setTotalPages(Math.ceil(res.count / PAGE_LIMIT))
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [traitId, page])

  if (loading) return <Loading message="Loading characters..." />
  if (error) return <ErrorStatus message={error} />
  if (characters.length === 0) return <p className="text-xs text-muted italic">No characters listed.</p>

  return (
    <div className="flex flex-col gap-4">
      <CharactersCardsGrid
        characters={characters}
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
interface TraitDetailPageProps {
  id: number
}

export function TraitDetailPage({ id }: TraitDetailPageProps) {
  const [trait, setTrait] = useState<Trait | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sexualLevel, setSexualLevel] = useState<"safe" | "suggestive" | "explicit">("safe")
  const [violenceLevel, setViolenceLevel] = useState<"tame" | "violent" | "brutal">("tame")

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    setTrait(null)

    api.by_id.trait(id, {}, ctrl.signal)
      .then(data => { if (!ctrl.signal.aborted) setTrait(data) })
      .catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })

    return () => ctrl.abort()
  }, [id])

  if (loading) return (
    <main className="flex-1 flex items-center justify-center">
      <Loading message="Loading trait..." />
    </main>
  )

  if (error || !trait) return (
    <main className="flex-1 flex items-center justify-center">
      <ErrorStatus message={error || "Trait not found"} />
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
          <TraitInfoPanel trait={trait} />
        </div>
      </aside>

            <div className="flex-1 min-w-0 overflow-y-auto py-4 pb-12">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{trait.name}</h1>
            {trait.group_name && (
              <p className="text-sm text-muted mt-0.5">{trait.group_name}</p>
            )}
          </div>

          {trait.description && (
            <Section title="Description">
              <VNDescription text={trait.description} />
            </Section>
          )}

          <Section title={`Characters (${trait.char_count.toLocaleString()})`}>
            <TraitCharacters traitId={trait.id} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
          </Section>
        </div>
      </div>
    </main>
  )
}
