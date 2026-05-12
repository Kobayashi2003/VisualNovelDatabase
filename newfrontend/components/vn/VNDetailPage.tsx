"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import type { VN } from "@/lib/types"
import { useSearchContext } from "@/context/SearchContext"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { VNInfoPanel } from "./VNInfoPanel"
import { VNDescription } from "./VNDescription"
import { VNTags } from "./VNTags"
import { VNScreenshots } from "./VNScreenshots"
import { VNStaff } from "./VNStaff"
import { VNCharacters } from "./VNCharacters"
import { VNReleases } from "./VNReleases"

interface VNDetailPageProps {
  id: number
}

export function VNDetailPage({ id }: VNDetailPageProps) {
  const [vn, setVn] = useState<VN | null>(null)
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
    setVn(null)

    api.by_id.vn(id, {}, ctrl.signal)
      .then(data => { if (!ctrl.signal.aborted) setVn(data) })
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

  if (error || !vn) {
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
      {/* Left: sidebar — fixed height, scrolls independently */}
      <aside className="hidden lg:flex flex-col gap-3 w-64 xl:w-72 shrink-0 overflow-y-auto py-4 pr-1">
        {/* Level controls */}
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
        <VNInfoPanel vn={vn} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
      </aside>

      {/* Right: main content — scrolls independently */}
      <div className="flex-1 min-w-0 overflow-y-auto py-4 pb-12">
        {/* Mobile: level controls + cover + info */}
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
          <VNInfoPanel vn={vn} sexualLevel={sexualLevel} violenceLevel={violenceLevel} mobile />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {showOriginal && vn.alttitle ? vn.alttitle : vn.title}
            </h1>
            {!showOriginal && vn.alttitle && <p className="text-muted text-sm mt-0.5">{vn.alttitle}</p>}
          </div>

          {/* Description */}
          {vn.description && (
            <Section title="Description">
              <VNDescription text={vn.description} />
            </Section>
          )}

          {/* Tags */}
          {vn.tags.length > 0 && (
            <Section title="Tags">
              <VNTags tags={vn.tags} sexualLevel={sexualLevel} />
            </Section>
          )}

          {/* Characters */}
          {vn.characters.length > 0 && (
            <Section title="Characters">
              <VNCharacters
                characters={vn.characters}
                va={vn.va}
                sexualLevel={sexualLevel}
                violenceLevel={violenceLevel}
              />
            </Section>
          )}

          {/* Staff */}
          {vn.staff.length > 0 && (
            <Section title="Staff">
              <VNStaff staff={vn.staff} editions={vn.editions} />
            </Section>
          )}

          {/* Releases */}
          {vn.releases && vn.releases.length > 0 && (
            <Section title="Releases">
              <VNReleases releases={vn.releases} olang={vn.olang} />
            </Section>
          )}

          {/* Screenshots */}
          {vn.screenshots.length > 0 && (
            <Section title="Screenshots">
              <VNScreenshots
                screenshots={vn.screenshots}
                sexualLevel={sexualLevel}
                violenceLevel={violenceLevel}
              />
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
