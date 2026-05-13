"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ENUMS } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { useSearchContext } from "@/context/SearchContext"
import type { VN } from "@/lib/types"

type VNCharacter = VN["characters"][number]
type VAEntry = VN["va"][number]

const ROLE_TABS = [
  { value: "all", label: "All" },
  { value: "main", label: "Protagonist" },
  { value: "primary", label: "Main" },
  { value: "side", label: "Side" },
  { value: "appears", label: "Appears" },
] as const

function shouldBlur(
  image: VNCharacter["image"],
  sexualLevel: string, violenceLevel: string
): boolean {
  if (!image) return false
  const isSexual = (sexualLevel === "safe" && image.sexual > 0.5) || (sexualLevel === "suggestive" && image.sexual > 1.5)
  const isViolent = (violenceLevel === "tame" && image.violence > 0.5) || (violenceLevel === "violent" && image.violence > 1.5)
  return isSexual || isViolent
}

const ROLE_LABEL = ENUMS.CHARACTER_ROLE as Record<string, string>

const SEX_LABEL: Record<string, string> = {
  m: "Male",
  f: "Female",
  b: "Both",
  n: "Unknown",
}

interface VNCharactersProps {
  characters: VNCharacter[]
  va: VAEntry[]
  sexualLevel: string
  violenceLevel: string
}

export function VNCharacters({ characters, va, sexualLevel, violenceLevel }: VNCharactersProps) {
  const [activeRole, setActiveRole] = useState<string>("all")
  const [spoilerLevel, setSpoilerLevel] = useState<0 | 1 | 2>(0)
  const { showOriginal } = useSearchContext()

  // Build VA map: characterId → va entries
  const vaMap = new Map<string, VAEntry[]>()
  for (const entry of va) {
    const arr = vaMap.get(entry.character.id) ?? []
    arr.push(entry)
    vaMap.set(entry.character.id, arr)
  }

  // Get dominant role per character (first vns[] entry's role)
  const getRole = (c: VNCharacter): string => c.vns[0]?.role ?? "appears"
  const getSpoiler = (c: VNCharacter): number => c.vns[0]?.spoiler ?? 0

  // Characters after role filter (ignoring spoiler for count purposes)
  const byRole = activeRole === "all"
    ? characters
    : characters.filter(c => getRole(c) === activeRole)

  // Separate visible from hidden by spoiler level
  const visible = byRole.filter(c => getSpoiler(c) <= spoilerLevel)
  const hiddenMinor = byRole.filter(c => getSpoiler(c) === 1 && spoilerLevel < 1).length
  const hiddenMajor = byRole.filter(c => getSpoiler(c) === 2 && spoilerLevel < 2).length

  const hasMinorSpoilers = characters.some(c => getSpoiler(c) === 1)
  const hasMajorSpoilers = characters.some(c => getSpoiler(c) === 2)
  const hasAnySpoilers = hasMinorSpoilers || hasMajorSpoilers

  // Role tab counts based on all characters (regardless of spoiler filter)
  const roleCounts = ROLE_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.value] = tab.value === "all"
      ? characters.length
      : characters.filter(c => getRole(c) === tab.value).length
    return acc
  }, {})

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

  return (
    <div>
      {/* Controls row: role tabs + spoiler toggle */}
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {ROLE_TABS.map(tab => (
            tab.value !== "all" && roleCounts[tab.value] === 0 ? null : (
              <button
                key={tab.value}
                onClick={() => setActiveRole(tab.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  activeRole === tab.value
                    ? "bg-white/20 text-white"
                    : "text-muted hover:text-white hover:bg-white/10"
                )}
              >
                {tab.label}
                {roleCounts[tab.value] > 0 && (
                  <span className="ml-1.5 text-muted">{roleCounts[tab.value]}</span>
                )}
              </button>
            )
          ))}
        </div>
        {hasAnySpoilers && (
          <button
            onClick={() => setSpoilerLevel(nextSpoilerLevel())}
            className="text-xs text-muted hover:text-white transition-colors shrink-0 py-1"
          >
            {spoilerButtonLabel()}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-stretch">
        {visible.map(c => {
          const blurred = shouldBlur(c.image, sexualLevel, violenceLevel)
          const role = getRole(c)
          const vaEntries = vaMap.get(c.id) ?? []

          // Sex spoiler: sex[1] is real sex, only show if differs from apparent AND spoilerLevel >= 2
          const sexApparent = c.sex?.[0]
          const sexReal = c.sex?.[1]
          const hasSexSpoiler = !!(sexApparent && sexReal && sexReal !== sexApparent && sexReal !== "n")

          return (
            <Link key={c.id} href={`/${c.id}`} className="group block h-full">
              <div className="h-full flex flex-col rounded-lg overflow-hidden bg-surface border border-white/5 hover:border-white/20 transition-all hover:scale-[1.02] duration-200">
                <div className="relative w-full aspect-3/4 shrink-0 bg-elevated">
                  {c.image ? (
                    <Image
                      src={c.image.url}
                      alt={c.name}
                      fill
                      className={cn(
                        "object-cover object-top transition-all duration-300",
                        blurred && "blur-xl scale-105"
                      )}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">
                      No image
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-linear-to-t from-black/80 to-transparent">
                    <span className="text-xs text-white/70">{ROLE_LABEL[role] ?? role}</span>
                  </div>
                </div>

                <div className="flex-1 p-2 min-h-18 overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">
                    {showOriginal && c.original ? c.original : c.name}
                  </p>
                  {!showOriginal && c.original && (
                    <p className="text-xs text-muted truncate">{c.original}</p>
                  )}

                  {sexApparent && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={cn(
                        (ICON.CHARACTER_SEX as Record<string, string>)[sexApparent],
                        "charsex-" + sexApparent
                      )} />
                      <span className="text-xs text-muted/80 truncate">
                        {SEX_LABEL[sexApparent] ?? sexApparent}
                        {hasSexSpoiler && spoilerLevel < 2 && (
                          <span className="text-yellow-500/70"> (?)</span>
                        )}
                        {hasSexSpoiler && spoilerLevel >= 2 && sexReal && (
                          <span className="text-yellow-400"> → {SEX_LABEL[sexReal] ?? sexReal}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {vaEntries.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {vaEntries.map((v, i) => (
                        <p key={i} className="text-xs text-muted/80 truncate">
                          CV: <span>
                            {showOriginal && v.staff.original ? v.staff.original : v.staff.name}
                          </span>
                          {v.note && <span className="text-muted/60"> ({v.note})</span>}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}

        {/* Minor spoiler placeholder */}
        {hiddenMinor > 0 && (
          <button
            onClick={() => setSpoilerLevel(1)}
            className="h-full rounded-lg border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors flex flex-col items-center justify-center gap-1.5 p-4 min-h-48"
          >
            <span className="text-sm font-semibold text-yellow-400">+{hiddenMinor}</span>
            <span className="text-xs text-yellow-500/70 text-center leading-relaxed">
              minor spoiler character{hiddenMinor !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-yellow-500/40">click to reveal</span>
          </button>
        )}

        {/* Major spoiler placeholder */}
        {hiddenMajor > 0 && (
          <button
            onClick={() => setSpoilerLevel(2)}
            className="h-full rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors flex flex-col items-center justify-center gap-1.5 p-4 min-h-48"
          >
            <span className="text-sm font-semibold text-orange-400">+{hiddenMajor}</span>
            <span className="text-xs text-orange-500/70 text-center leading-relaxed">
              major spoiler character{hiddenMajor !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-orange-500/40">click to reveal</span>
          </button>
        )}
      </div>
    </div>
  )
}
