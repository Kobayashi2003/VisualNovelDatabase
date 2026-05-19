/** Release detail page: image gallery + info sidebar + linked VNs + producers. */
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { createPortal } from "react-dom"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn, shouldBlur } from "@/lib/utils"
import { api } from "@/lib/api"
import { enumMap, enumLabel } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import type { Release } from "@/lib/types"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { useSearchContext } from "@/context/SearchContext"
import { useUserContext } from "@/context/UserContext"
import { displayTitle, displayName } from "@/lib/original"
import { InfoRow, Section } from "@/components/common/InfoPanel"


/* ─── Image gallery ────────────────────────────────────────────────────────── */

type ReleaseImage = Release["images"][number]

function ImageLightbox({
  images, index, onClose, onPrev, onNext, sexualLevel, violenceLevel,
}: {
  images: ReleaseImage[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  sexualLevel: string
  violenceLevel: string
}) {
  const img = images[index]
  const blurred = shouldBlur(img.sexual, img.violence, sexualLevel, violenceLevel)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "ArrowRight") onNext()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, onPrev, onNext])

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60"
            onClick={e => { e.stopPropagation(); onPrev() }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60"
            onClick={e => { e.stopPropagation(); onNext() }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div
        className="relative max-w-4xl max-h-[85vh] w-auto"
        onClick={e => e.stopPropagation()}
      >
        <Image
          src={img.url}
          alt={`Image ${index + 1}`}
          width={img.dims[0]}
          height={img.dims[1]}
          className={cn(
            "max-h-[85vh] w-auto object-contain rounded transition-all duration-300",
            blurred && "blur-xl scale-95"
          )}
          unoptimized
        />
      </div>

      {images.length > 1 && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60">
          {index + 1} / {images.length}
        </span>
      )}
    </div>,
    document.body
  )
}

function ReleaseImages({
  images, sexualLevel, violenceLevel,
}: {
  images: ReleaseImage[]
  sexualLevel: string
  violenceLevel: string
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const open = useCallback((i: number) => setLightboxIndex(i), [])
  const close = useCallback(() => setLightboxIndex(null), [])
  const prev = useCallback(() => setLightboxIndex(i => i != null ? (i - 1 + images.length) % images.length : null), [images.length])
  const next = useCallback(() => setLightboxIndex(i => i != null ? (i + 1) % images.length : null), [images.length])

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {images.map((img, i) => {
          const blurred = shouldBlur(img.sexual, img.violence, sexualLevel, violenceLevel)
          return (
            <button
              key={img.id}
              onClick={() => open(i)}
              className="relative w-24 h-14 rounded overflow-hidden bg-elevated shrink-0 hover:ring-2 hover:ring-accent transition-all"
            >
              <Image
                src={img.thumbnail}
                alt={`Image ${i + 1}`}
                fill
                className={cn(
                  "object-cover transition-all duration-300",
                  blurred && "blur-md scale-105"
                )}
                sizes="96px"
              />
            </button>
          )
        })}
      </div>

      {lightboxIndex != null && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
          sexualLevel={sexualLevel}
          violenceLevel={violenceLevel}
        />
      )}
    </>
  )
}

/* ─── Sidebar info panel ───────────────────────────────────────────────────── */

function ReleaseInfoPanel({ release }: { release: Release }) {
  const rtypes = [...new Set(release.vns.map(v => v.rtype))]
  const ageLabel = release.minage == null ? null : release.minage === 0 ? "All Ages" : `${release.minage}+`
  const PLATFORM = enumMap('PLATFORM')
  const VOICED = enumMap('VOICED')
  const MEDIUM = enumMap('MEDIUM')
  const PLAT_ICON = ICON.PLATFORM as Record<string, string>
  const MEDIA_ICON = ICON.RELEASE_MEDIA as Record<string, string>
  const VOICED_ICON = ICON.RELEASE_VOICED as Record<number, string>

  // Detect resolution aspect ratio
  let resoIcon: string | null = null
  let resoDisplay: string | null = null
  if (release.resolution) {
    const raw = Array.isArray(release.resolution)
      ? `${(release.resolution as unknown as number[])[0]}x${(release.resolution as unknown as number[])[1]}`
      : String(release.resolution)
    const m = raw.match(/^(\d+)x(\d+)$/)
    if (m) {
      resoDisplay = `${m[1]} × ${m[2]}`
      const ratio = Number(m[1]) / Number(m[2])
      if (Math.abs(ratio - 16 / 9) < 0.05) resoIcon = "icon-rel-reso-169"
      else if (Math.abs(ratio - 4 / 3) < 0.05) resoIcon = "icon-rel-reso-43"
      else resoIcon = "icon-rel-reso-custom"
    } else {
      resoDisplay = raw
    }
  }

  const LANG_ICON = ICON.LANGUAGE as Record<string, string>

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
        {release.released && (
          <InfoRow label="Released">{release.released}</InfoRow>
        )}

        {rtypes.length > 0 && (
          <InfoRow label="Type">
            <div className="flex gap-2 flex-wrap">
              {rtypes.map(rt => (
                <span key={rt} className={cn(
                  "text-xs font-medium",
                  rt === "complete" ? "text-green-400" :
                  rt === "trial" ? "text-blue-400" :
                  rt === "partial" ? "text-yellow-400" : "text-white/80"
                )}>
                  {enumLabel('RTYPE', rt)}
                </span>
              ))}
            </div>
          </InfoRow>
        )}

        {ageLabel && (
          <InfoRow label="Age Rating">
            <span className={cn(
              "text-xs font-medium",
              release.minage === 0 ? "text-green-400" :
              (release.minage ?? 0) >= 18 ? "text-red-400" :
              (release.minage ?? 0) >= 17 ? "text-orange-400" :
              (release.minage ?? 0) >= 15 ? "text-yellow-400" : "text-white/80"
            )}>
              {ageLabel}
            </span>
          </InfoRow>
        )}

        {release.platforms.length > 0 && (
          <InfoRow label="Platforms">
            <div className="flex flex-wrap gap-1.5">
              {release.platforms.map(p => (
                PLAT_ICON[p]
                  ? <span key={p} className={PLAT_ICON[p]} title={PLATFORM[p] ?? p} />
                  : <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">{PLATFORM[p] ?? p}</span>
              ))}
            </div>
          </InfoRow>
        )}

        {release.languages.length > 0 && (
          <InfoRow label="Languages">
            <div className="flex flex-col gap-1.5 w-full">
              {release.languages.map((lang, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {LANG_ICON[lang.lang] && <span className={LANG_ICON[lang.lang]} />}
                    <span className={cn(
                      "text-xs",
                      lang.main ? "text-white/90 font-medium" : "text-white/70"
                    )}>
                      {enumLabel('LANGUAGE', lang.lang)}
                    </span>
                    {lang.mtl && (
                      <span className="text-xs text-amber-400/80">[MTL]</span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </InfoRow>
        )}

        {release.media.length > 0 && (
          <InfoRow label="Media">
            {release.media.map((m, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">
                {MEDIA_ICON[m.medium] && <span className={MEDIA_ICON[m.medium]} />}
                {MEDIUM[m.medium] ?? m.medium}
                {m.qty ? ` ×${m.qty}` : ""}
              </span>
            ))}
          </InfoRow>
        )}

        {resoDisplay && (
          <InfoRow label="Resolution">
            <span className="flex items-center gap-1">
              {resoIcon && <span className={resoIcon} />}
              {resoDisplay}
            </span>
          </InfoRow>
        )}

        {release.engine && (
          <InfoRow label="Engine">{release.engine}</InfoRow>
        )}

        {release.voiced != null && (
          <InfoRow label="Voiced">
            <span className="flex items-center gap-1.5">
              <span className={VOICED_ICON[release.voiced] ?? "icon-rel-voiced"} />
              {VOICED[release.voiced] ?? String(release.voiced)}
            </span>
          </InfoRow>
        )}

        {release.freeware != null && (
          <InfoRow label="Publication">
            <span className="flex items-center gap-1.5 text-xs">
              <span className={release.freeware ? "icon-rel-free" : "icon-rel-nonfree"} />
              <span className={release.freeware ? "text-green-400" : "text-white/80"}>
                {release.freeware ? "Freeware" : "Non-free commercial"}
              </span>
            </span>
          </InfoRow>
        )}

        {release.gtin && (
          <InfoRow label="GTIN">{release.gtin}</InfoRow>
        )}

        {release.catalog && (
          <InfoRow label="Catalog">{release.catalog}</InfoRow>
        )}
      </div>

      {release.extlinks.length > 0 && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Links</p>
          <div className="flex flex-wrap gap-1.5">
            {release.extlinks.map((link, i) => (
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
    </div>
  )
}

/* ─── Linked VNs ───────────────────────────────────────────────────────────── */

function LinkedVNs({ vns }: { vns: Release["vns"] }) {
  const { showOriginal } = useSearchContext()
  return (
    <div className="flex flex-col gap-2">
      {vns.map(vn => (
        <Link
          key={vn.id}
          href={`/${vn.id}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-white/5 hover:bg-white/5 hover:border-white/10 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{displayTitle(vn, showOriginal)}</p>
          </div>
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 shrink-0">
            {enumLabel('RTYPE', vn.rtype)}
          </span>
        </Link>
      ))}
    </div>
  )
}

/* ─── Producers ────────────────────────────────────────────────────────────── */

function ReleaseProducers({ producers }: { producers: NonNullable<Release["producers"]> }) {
  const { showOriginal } = useSearchContext()
  const developers = producers.filter(p => p.developer)
  const publishers = producers.filter(p => p.publisher)

  const renderList = (list: NonNullable<Release["producers"]>) => (
    <div className="flex flex-col gap-2">
      {list.map(p => (
        <Link
          key={p.id}
          href={`/${p.id}`}
          className="flex items-center px-3 py-2 rounded-lg bg-surface border border-white/5 hover:bg-white/5 hover:border-white/10 transition-colors"
        >
          <p className="text-sm text-white truncate">{displayName(p, showOriginal)}</p>
        </Link>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {developers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Developer</p>
          {renderList(developers)}
        </div>
      )}
      {publishers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Publisher</p>
          {renderList(publishers)}
        </div>
      )}
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

interface ReleaseDetailPageProps {
  id: number
}

export function ReleaseDetailPage({ id }: ReleaseDetailPageProps) {
  const [release, setRelease] = useState<Release | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { defaultSexualLevel, defaultViolenceLevel } = useUserContext()
  const [sexualLevel, setSexualLevel] = useState(defaultSexualLevel)
  const [violenceLevel, setViolenceLevel] = useState(defaultViolenceLevel)
  const abortRef = useRef<AbortController | null>(null)
  const { showOriginal } = useSearchContext()

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    setRelease(null)

    api.by_id.release(id, {}, ctrl.signal)
      .then(data => { if (!ctrl.signal.aborted) setRelease(data) })
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

  if (error || !release) {
    return (
      <main className="container mx-auto flex-1 flex items-center justify-center p-4">
        <ErrorStatus message={error ?? "Not found"} />
      </main>
    )
  }

  const LANG_ICON = ICON.LANGUAGE as Record<string, string>
  const mainLang = release.languages.find(l => l.main)

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
        <ReleaseInfoPanel release={release} />
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
          <ReleaseInfoPanel release={release} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {mainLang && LANG_ICON[mainLang.lang] && (
                <span className={LANG_ICON[mainLang.lang]} />
              )}
              <h1 className="text-2xl font-bold text-white leading-tight">
                {displayTitle(release, showOriginal)}
              </h1>
            </div>
          </div>

          {release.notes && (
            <Section title="Notes">
              <p className="text-sm text-white/80 whitespace-pre-wrap">{release.notes}</p>
            </Section>
          )}

          {release.vns.length > 0 && (
            <Section title={`Visual Novels (${release.vns.length})`}>
              <LinkedVNs vns={release.vns} />
            </Section>
          )}

          {release.producers && release.producers.length > 0 && (
            <Section title="Producers" count={release.producers.length}>
              <ReleaseProducers producers={release.producers} />
            </Section>
          )}

          {release.images.length > 0 && (
            <Section title={`Images (${release.images.length})`}>
              <ReleaseImages
                images={release.images}
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
