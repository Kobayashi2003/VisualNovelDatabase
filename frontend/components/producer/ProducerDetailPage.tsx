/** Producer detail page: info sidebar + description + paginated VN catalog. */
"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import { enumLabel } from "@/lib/enums"
import { displayName } from "@/lib/original"
import type { Producer } from "@/lib/types"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { CollectionButton } from "@/components/category/CollectionButton"
import { InfoRow, Section, InlineList } from "@/components/common/InfoPanel"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { ExtLinks } from "@/components/common/ExtLinks"
import { TabBar } from "@/components/common/TabBar"
import { VNDescription } from "@/components/vn/VNDescription"
import { ProducerVNs } from "@/components/producer/ProducerVNs"
import { ProducerReleases } from "@/components/producer/ProducerReleases"

/* ─── Sidebar info panel ───────────────────────────────────────────────────── */

interface ProducerInfoPanelProps {
  producer: Producer
}

function ProducerInfoPanel({ producer }: ProducerInfoPanelProps) {
  const hasInfo = producer.type || producer.lang || producer.aliases.length > 0

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
          {producer.type && (
            <InfoRow label="Type">
              {enumLabel('TYPE', producer.type)}
            </InfoRow>
          )}
          {producer.lang && (
            <InfoRow label="Language">
              <LanguageIcons langs={[producer.lang]} />
            </InfoRow>
          )}
          {producer.aliases.length > 0 && (
            <InfoRow label="Aliases">
              <InlineList className="text-white/70" items={producer.aliases} />
            </InfoRow>
          )}
        </div>
      )}

      <ExtLinks links={producer.extlinks} />

      <CollectionButton type="producer" id={producer.id} />
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

interface ProducerDetailPageProps {
  id: number
}

type ProducerTab = "vns" | "releases"

export function ProducerDetailPage({ id }: ProducerDetailPageProps) {
  const [producer, setProducer] = useState<Producer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)
  // null = count not loaded yet; a number once the eager count query resolves.
  const [vnCount, setVnCount] = useState<number | null>(null)
  const [releaseCount, setReleaseCount] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<ProducerTab>("vns")
  const abortRef = useRef<AbortController | null>(null)
  const { showOriginal } = useSearchContext()

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    setProducer(null)
    setVnCount(null)
    setReleaseCount(null)

    api.by_id.producer(id, {}, ctrl.signal)
      .then(data => {
        if (ctrl.signal.aborted) return
        setProducer(data)
        // Eagerly fetch every tab's count together, so the tab bar is
        // consistent and empty tabs can be hidden.
        Promise.all([
          api.small.vn({ developer: data.id, limit: 1 }, ctrl.signal),
          api.small.release({ producer: data.id, limit: 1 }, ctrl.signal),
        ])
          .then(([vnRes, relRes]) => {
            if (ctrl.signal.aborted) return
            setVnCount(vnRes.count)
            setReleaseCount(relRes.count)
          })
          .catch(() => {})
      })
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

  // Tab bar: a tab with a known count of 0 is hidden; a tab still loading
  // (count null) stays visible without a badge.
  const tabDefs: { value: ProducerTab; label: string; count: number | null }[] = [
    { value: "vns", label: "Visual Novels", count: vnCount },
    { value: "releases", label: "Releases", count: releaseCount },
  ]
  const visibleTabs = tabDefs.filter(t => t.count == null || t.count > 0)
  const effectiveTab = visibleTabs.some(t => t.value === activeTab)
    ? activeTab
    : visibleTabs[0]?.value

  return (
    <div
      className="container mx-auto flex gap-6 px-4 overflow-hidden"
      style={{ height: "calc(100vh - var(--header-h, 4rem))" }}
    >
      <aside className="hidden lg:flex flex-col gap-3 w-56 xl:w-64 shrink-0 overflow-y-auto py-4 pr-1">
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
        <ProducerInfoPanel producer={producer} />
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto py-4 pb-12">
        {/* Mobile: level controls + info panel */}
        <div className="lg:hidden flex flex-col gap-3 mb-6">
          <div className="flex flex-row gap-2">
            <SexualLevelSelector
              sexualLevel={sexualLevel}
              setSexualLevel={setSexualLevel}
              className="flex-1"
            />
            <ViolenceLevelSelector
              violenceLevel={violenceLevel}
              setViolenceLevel={setViolenceLevel}
              className="flex-1"
            />
          </div>
          <ProducerInfoPanel producer={producer} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {displayName(producer, showOriginal)}
            </h1>
          </div>

          {producer.description && (
            <Section title="Description">
              <VNDescription text={producer.description} />
            </Section>
          )}

          <div>
            {visibleTabs.length > 0 && (
              <div className="mb-3">
                <TabBar
                  tabs={visibleTabs.map(t => ({ value: t.value, label: t.label, count: t.count ?? undefined }))}
                  active={effectiveTab ?? ""}
                  onChange={v => setActiveTab(v as ProducerTab)}
                />
              </div>
            )}
            {effectiveTab === "vns" ? (
              <ProducerVNs
                producerId={producer.id}
                sexualLevel={sexualLevel}
                violenceLevel={violenceLevel}
              />
            ) : effectiveTab === "releases" ? (
              <ProducerReleases
                producerId={producer.id}
                producerLang={producer.lang}
              />
            ) : (
              <p className="text-sm text-muted">No visual novels or releases found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
