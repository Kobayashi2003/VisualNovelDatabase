"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import { useSearchContext } from "@/context/SearchContext"
import { ENUMS } from "@/lib/enums"
import type { Producer, VN_Small, Category } from "@/lib/types"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { VNDescription } from "@/components/vn/VNDescription"
import { VNsCardsGrid } from "@/components/card/CardsGrid"
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
function CollectionButton({ producerId }: { producerId: string }) {
  const { user } = useUserContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [markedCatIds, setMarkedCatIds] = useState<Set<number>>(new Set())
  const markId = parseInt(producerId.replace(/^p/, ""), 10)

  const refresh = useCallback(async () => {
    const cats = await api.category.get("producer")
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
      await api.category.removeMark("producer", catId, markId)
    } else {
      await api.category.addMark("producer", catId, markId)
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
interface ProducerInfoPanelProps {
  producer: Producer
}

function ProducerInfoPanel({ producer }: ProducerInfoPanelProps) {
  const hasInfo = producer.type || producer.lang || producer.aliases.length > 0
  const hasExtlinks = producer.extlinks.length > 0

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
          {producer.type && (
            <InfoRow label="Type">
              {(ENUMS.TYPE as Record<string, string>)[producer.type] ?? producer.type}
            </InfoRow>
          )}
          {producer.lang && (
            <InfoRow label="Language">
              {(ENUMS.LANGUAGE as Record<string, string>)[producer.lang] ?? producer.lang}
            </InfoRow>
          )}
          {producer.aliases.length > 0 && (
            <InfoRow label="Aliases">
              <div className="flex flex-col gap-1 w-full">
                {producer.aliases.map((alias, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80 w-full">
                    {alias}
                  </span>
                ))}
              </div>
            </InfoRow>
          )}
        </div>
      )}

      {hasExtlinks && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Links</p>
          <div className="flex flex-wrap gap-1.5">
            {producer.extlinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <CollectionButton producerId={producer.id} />
    </div>
  )
}

// ─── VN list section ──────────────────────────────────────────────────────────
interface ProducerVNsProps {
  producerId: string
  sexualLevel: "safe" | "suggestive" | "explicit"
  violenceLevel: "tame" | "violent" | "brutal"
}

function ProducerVNs({ producerId, sexualLevel, violenceLevel }: ProducerVNsProps) {
  const [vns, setVns] = useState<VN_Small[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.small.vn({ developer: producerId, sort: "released", reverse: true, limit: PAGE_LIMIT, page })
      .then(res => {
        if (cancelled) return
        setVns(res.results)
        setTotalPages(Math.ceil(res.count / PAGE_LIMIT))
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [producerId, page])

  if (loading) return <Loading message="Loading visual novels..." />
  if (error) return <ErrorStatus message={error} />
  if (vns.length === 0) return <p className="text-sm text-muted">No visual novels found.</p>

  return (
    <div className="flex flex-col gap-4">
      <VNsCardsGrid vns={vns} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
      <PaginationButtons totalPages={totalPages} currentPage={page} onPageChange={p => { setPage(p); }} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface ProducerDetailPageProps {
  id: number
}

export function ProducerDetailPage({ id }: ProducerDetailPageProps) {
  const [producer, setProducer] = useState<Producer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sexualLevel, setSexualLevel] = useState<"safe" | "suggestive" | "explicit">("safe")
  const [violenceLevel, setViolenceLevel] = useState<"tame" | "violent" | "brutal">("tame")
  const abortRef = useRef<AbortController | null>(null)
  const { showOriginal } = useSearchContext()

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    setProducer(null)

    api.by_id.producer(id, {}, ctrl.signal)
      .then(data => { if (!ctrl.signal.aborted) setProducer(data) })
      .catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })

    return () => ctrl.abort()
  }, [id])

  if (loading) {
    return (
      <main className="container mx-auto flex-1 flex items-center justify-center p-4">
        <Loading message="Loading..." />
      </main>
    )
  }

  if (error || !producer) {
    return (
      <main className="container mx-auto flex-1 flex items-center justify-center p-4">
        <ErrorStatus message={error ?? "Not found"} />
      </main>
    )
  }

  return (
    <div
      className="container mx-auto flex gap-6 px-4 overflow-hidden"
      style={{ height: "calc(100vh - var(--header-h, 4rem))" }}
    >
      <aside className="hidden lg:flex flex-col gap-3 w-56 xl:w-64 shrink-0 overflow-y-auto py-4 pr-1">
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
        <ProducerInfoPanel producer={producer} />
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto py-4 pb-12">
        {/* Mobile: level controls + info panel */}
        <div className="lg:hidden flex flex-col gap-3 mb-6">
          <div className="flex flex-row gap-2">
            <SexualLevelSelector
              sexualLevel={sexualLevel}
              setSexualLevel={v => setSexualLevel(v as "safe" | "suggestive" | "explicit")}
              className="flex-1"
            />
            <ViolenceLevelSelector
              violenceLevel={violenceLevel}
              setViolenceLevel={v => setViolenceLevel(v as "tame" | "violent" | "brutal")}
              className="flex-1"
            />
          </div>
          <ProducerInfoPanel producer={producer} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {showOriginal && producer.original ? producer.original : producer.name}
            </h1>
            {!showOriginal && producer.original && <p className="text-muted text-sm mt-0.5">{producer.original}</p>}
          </div>

                    {producer.description && (
            <Section title="Description">
              <VNDescription text={producer.description} />
            </Section>
          )}

                    <Section title="Visual Novels">
            <ProducerVNs
              producerId={producer.id}
              sexualLevel={sexualLevel}
              violenceLevel={violenceLevel}
            />
          </Section>
        </div>
      </div>
    </div>
  )
}
