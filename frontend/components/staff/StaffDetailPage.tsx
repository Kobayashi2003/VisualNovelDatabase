/** Staff detail page: info sidebar + description + paginated VN credits. */
"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { enumLabel } from "@/lib/enums"
import { displayName } from "@/lib/original"
import type { Staff } from "@/lib/types"
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
import { StaffVNCredits } from "@/components/staff/StaffVNCredits"
import { StaffVoicedCharacters } from "@/components/staff/StaffVoicedCharacters"

const GENDER_LABEL: Record<string, string> = { m: "Male", f: "Female" }

/* ─── Sidebar info panel ───────────────────────────────────────────────────── */

interface StaffInfoPanelProps {
  staff: Staff
}

function StaffInfoPanel({ staff }: StaffInfoPanelProps) {
  const hasInfo = staff.gender || staff.lang || staff.aliases.length > 0
  const hasExtlinks = staff.extlinks.length > 0

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
          {staff.lang && (
            <InfoRow label="Language">
              {enumLabel('LANGUAGE', staff.lang)}
            </InfoRow>
          )}
          {staff.gender && (
            <InfoRow label="Gender">
              {GENDER_LABEL[staff.gender] ?? staff.gender}
            </InfoRow>
          )}
          {staff.aliases.length > 0 && (
            <InfoRow label="Aliases">
              <div className="flex flex-col gap-1 w-full">
                {staff.aliases.map((alias) => (
                  <div key={alias.aid} className="flex flex-col gap-0.5 w-full px-2 py-1 rounded bg-white/5 border border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-xs", alias.is_main ? "text-accent font-medium" : "text-white/90")}>
                        {alias.name}
                      </span>
                      {alias.is_main && (
                        <span className="text-xs text-accent/70">(main)</span>
                      )}
                    </div>
                    {alias.latin && (
                      <span className="text-xs text-muted">{alias.latin}</span>
                    )}
                  </div>
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
            {staff.extlinks.map((link, i) => (
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

      <CollectionButton type="staff" id={staff.id} />
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

interface StaffDetailPageProps {
  id: number
}

export function StaffDetailPage({ id }: StaffDetailPageProps) {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel as "safe" | "suggestive" | "explicit")
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel as "tame" | "violent" | "brutal")
  const [activeTab, setActiveTab] = useState<"credits" | "characters">("credits")
  const [voicedCount, setVoicedCount] = useState(0)
  const [vnCreditsCount, setVnCreditsCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const { showOriginal } = useSearchContext()

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    setStaff(null)

    api.by_id.staff(id, {}, ctrl.signal)
      .then(data => {
        if (!ctrl.signal.aborted) {
          setStaff(data)
          api.small.character({ seiyuu: data.id, limit: 1 })
            .then(res => { if (!ctrl.signal.aborted) setVoicedCount(res.count) })
            .catch(() => {})
        }
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

  if (error || !staff) {
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
        <StaffInfoPanel staff={staff} />
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
          <StaffInfoPanel staff={staff} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {displayName(staff, showOriginal)}
            </h1>
            {!staff.ismain && (
              <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                Alias entry
              </span>
            )}
          </div>

          {staff.description && (
            <Section title="Description">
              <VNDescription text={staff.description} />
            </Section>
          )}

          <div>
            <div className="mb-3">
              <TabBar
                tabs={[
                  { value: "credits", label: "VN Credits", count: vnCreditsCount || undefined },
                  ...(voicedCount > 0 ? [{ value: "characters", label: "Voiced Characters", count: voicedCount }] : [])
                ]}
                active={activeTab}
                onChange={v => setActiveTab(v as "credits" | "characters")}
              />
            </div>
            {activeTab === "credits" ? (
              <StaffVNCredits
                staffId={staff.id}
                sexualLevel={sexualLevel}
                violenceLevel={violenceLevel}
                onCountLoaded={setVnCreditsCount}
              />
            ) : (
              <StaffVoicedCharacters
                staffId={staff.id}
                sexualLevel={sexualLevel}
                violenceLevel={violenceLevel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
