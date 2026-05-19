/** Trait detail page: info sidebar + description + paginated characters with the trait. */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { CollectionButton } from "@/components/category/CollectionButton"
import type { Trait, Character_Small } from "@/lib/types"
import { useUserContext } from "@/context/UserContext"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { VNDescription } from "@/components/vn/VNDescription"
import { CharactersCardsGrid } from "@/components/card/CardsGrid"
import { PaginationButtons } from "@/components/button/PaginationButtons"
import { PAGE_LIMIT } from "@/lib/constants"
import { InfoRow, Section } from "@/components/common/InfoPanel"

/* ─── Sidebar info panel ───────────────────────────────────────────────────── */

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
      <CollectionButton type="trait" id={trait.id} />
    </div>
  )
}

/* ─── Characters section ───────────────────────────────────────────────────── */
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

/* ─── Main page ────────────────────────────────────────────────────────────── */
interface TraitDetailPageProps {
  id: number
}

export function TraitDetailPage({ id }: TraitDetailPageProps) {
  const [trait, setTrait] = useState<Trait | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)

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
              setSexualLevel={setSexualLevel}
            />
            <ViolenceLevelSelector
              violenceLevel={violenceLevel}
              setViolenceLevel={setViolenceLevel}
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
