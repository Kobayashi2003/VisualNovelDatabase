"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import type { Character } from "@/lib/types"
import { useSearchContext } from "@/context/SearchContext"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { VNDescription } from "@/components/vn/VNDescription"
import { CharacterInfoPanel } from "./CharacterInfoPanel"
import { CharacterTraits } from "./CharacterTraits"
import { CharacterVNs } from "./CharacterVNs"

interface CharacterDetailPageProps {
  id: number
}

export function CharacterDetailPage({ id }: CharacterDetailPageProps) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sexualLevel, setSexualLevel] = useState<"safe" | "suggestive" | "explicit">("safe")
  const [violenceLevel, setViolenceLevel] = useState<"tame" | "violent" | "brutal">("tame")
  const [spoilerLevel, setSpoilerLevel] = useState<0 | 1 | 2>(0)
  const abortRef = useRef<AbortController | null>(null)
  const { showOriginal } = useSearchContext()

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    setCharacter(null)

    api.by_id.character(id, {}, ctrl.signal)
      .then(data => { if (!ctrl.signal.aborted) setCharacter(data) })
      .catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })

    return () => ctrl.abort()
  }, [id])

  const hasMinorSpoilers = character?.traits.some(t => t.spoiler === 1) ?? false
  const hasMajorSpoilers = character?.traits.some(t => t.spoiler === 2) ?? false
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

  if (loading) {
    return (
      <main className="container mx-auto flex-1 flex items-center justify-center p-4">
        <Loading message="Loading..." />
      </main>
    )
  }

  if (error || !character) {
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
      <aside className="hidden lg:flex flex-col gap-3 w-64 xl:w-72 shrink-0 overflow-y-auto py-4 pr-1">
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
        <CharacterInfoPanel
          character={character}
          sexualLevel={sexualLevel}
          violenceLevel={violenceLevel}
          spoilerLevel={spoilerLevel}
        />
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
          <CharacterInfoPanel
            character={character}
            sexualLevel={sexualLevel}
            violenceLevel={violenceLevel}
            spoilerLevel={spoilerLevel}
            mobile
          />
        </div>

        <div className="flex flex-col gap-6">
          {/* Title + spoiler toggle */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {showOriginal && character.original ? character.original : character.name}
              </h1>
              {!showOriginal && character.original && <p className="text-muted text-sm mt-0.5">{character.original}</p>}
            </div>
            {hasAnySpoilers && (
              <button
                onClick={() => setSpoilerLevel(nextSpoilerLevel())}
                className="text-xs text-muted hover:text-white transition-colors shrink-0 pt-1"
              >
                {spoilerButtonLabel()}
              </button>
            )}
          </div>

          {character.description && (
            <Section title="Description">
              <VNDescription text={character.description} />
            </Section>
          )}

          {character.traits.length > 0 && (
            <Section title="Traits">
              <CharacterTraits
                traits={character.traits}
                spoilerLevel={spoilerLevel}
                sexualLevel={sexualLevel}
                sex={character.sex?.[0]}
                onRevealMinor={() => setSpoilerLevel(hasMinorSpoilers && spoilerLevel < 1 ? 1 : spoilerLevel)}
                onRevealMajor={() => setSpoilerLevel(2)}
              />
            </Section>
          )}

          {character.vns.length > 0 && (
            <Section title="Visual Novels">
              <CharacterVNs vns={character.vns} />
            </Section>
          )}
        </div>
      </div>
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
