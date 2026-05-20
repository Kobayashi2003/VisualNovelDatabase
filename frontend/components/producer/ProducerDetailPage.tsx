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
import { InfoRow, Section } from "@/components/common/InfoPanel"
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
  const hasExtlinks = producer.extlinks.length > 0

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
              {enumLabel('LANGUAGE', producer.lang)}
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

      <CollectionButton type="producer" id={producer.id} />
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

interface ProducerDetailPageProps {
  id: number
}

export function ProducerDetailPage({ id }: ProducerDetailPageProps) {
  const [producer, setProducer] = useState<Producer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)
  const [vnCount, setVnCount] = useState(0)
  const [releaseCount, setReleaseCount] = useState(0)
  const [activeTab, setActiveTab] = useState<"vns" | "releases">("vns")
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
      .then(data => {
        if (ctrl.signal.aborted) return
        setProducer(data)
        api.small.release({ producer: data.id, limit: 1 }, ctrl.signal)
          .then(res => { if (!ctrl.signal.aborted) setReleaseCount(res.count) })
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
            <div className="mb-3">
              <TabBar
                tabs={[
                  { value: "vns", label: "Visual Novels", count: vnCount || undefined },
                  { value: "releases", label: "Releases", count: releaseCount || undefined },
                ]}
                active={activeTab}
                onChange={v => setActiveTab(v as "vns" | "releases")}
              />
            </div>
            {activeTab === "vns" ? (
              <ProducerVNs
                producerId={producer.id}
                sexualLevel={sexualLevel}
                violenceLevel={violenceLevel}
                onCountLoaded={setVnCount}
              />
            ) : (
              <ProducerReleases
                producerId={producer.id}
                producerLang={producer.lang}
                onCountLoaded={setReleaseCount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
