/** Character grid on the VN page, with role-filter tabs and seiyuu listings. */
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn, shouldBlur } from "@/lib/utils"
import { enumMap, enumLabel } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { displayName } from "@/lib/original"
import type { VN, VNCharacterLayout } from "@/lib/types"
import { useSearchContext } from "@/context/SearchContext"
import { useSpoilerLevel } from "@/hooks/useSpoilerLevel"
import { TabBar } from "@/components/common/TabBar"
import { ImageWithFallback } from "@/components/common/ImageWithFallback"
import { VNCharacterSlider } from "./VNCharacterSlider"

type VNCharacter = VN["characters"][number]
type VAEntry = VN["va"][number]

const ROLE_TABS = [
  { value: "all", label: "All" },
  { value: "main", label: "Protagonist" },
  { value: "primary", label: "Main" },
  { value: "side", label: "Side" },
  { value: "appears", label: "Appears" },
] as const

const ROLE_LABEL = enumMap('CHARACTER_ROLE')

interface VNCharactersProps {
  characters: VNCharacter[]
  va: VAEntry[]
  sexualLevel: string
  violenceLevel: string
  /** "grid" (default thumbnail grid) or "slider" (one dense card at a time). */
  layout?: VNCharacterLayout
  /** Open the expanded characters view, optionally focused on a character. */
  onExpand?: (charId: string) => void
}

export function VNCharacters({ characters, va, sexualLevel, violenceLevel, layout = "grid", onExpand }: VNCharactersProps) {
  const [activeRole, setActiveRole] = useState<string>("all")
  const { showOriginal } = useSearchContext()
  const router = useRouter()

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

  const spoiler = useSpoilerLevel(
    characters.some(c => getSpoiler(c) === 1),
    characters.some(c => getSpoiler(c) === 2),
  )

  // Characters after role filter (ignoring spoiler for count purposes)
  const byRole = activeRole === "all"
    ? characters
    : characters.filter(c => getRole(c) === activeRole)

  // Separate visible from hidden by spoiler level
  const visible = byRole.filter(c => getSpoiler(c) <= spoiler.spoilerLevel)
  const hiddenMinor = byRole.filter(c => getSpoiler(c) === 1 && spoiler.spoilerLevel < 1).length
  const hiddenMajor = byRole.filter(c => getSpoiler(c) === 2 && spoiler.spoilerLevel < 2).length

  // Role tab counts based on all characters (regardless of spoiler filter)
  const roleCounts = ROLE_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.value] = tab.value === "all"
      ? characters.length
      : characters.filter(c => getRole(c) === tab.value).length
    return acc
  }, {})

  return (
    <div>
      {/* Controls row: role tabs + spoiler toggle */}
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <TabBar
          tabs={ROLE_TABS
            .filter(tab => tab.value === "all" || roleCounts[tab.value] > 0)
            .map(tab => ({ value: tab.value, label: tab.label, count: roleCounts[tab.value] }))}
          active={activeRole}
          onChange={setActiveRole}
        />
        {spoiler.hasAnySpoilers && (
          <button
            onClick={spoiler.cycle}
            className={cn("text-xs transition-colors shrink-0 py-1", spoiler.buttonColor)}
          >
            {spoiler.buttonLabel}
          </button>
        )}
      </div>

      {layout === "slider" ? (
        <VNCharacterSlider
          characters={visible}
          sexualLevel={sexualLevel}
          violenceLevel={violenceLevel}
          spoilerLevel={spoiler.spoilerLevel}
          onExpand={onExpand}
        />
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-stretch">
        {visible.map(c => {
          const blurred = !!c.image && shouldBlur(c.image.sexual, c.image.violence, sexualLevel, violenceLevel)
          const role = getRole(c)
          const charSpoiler = getSpoiler(c)
          const vaEntries = vaMap.get(c.id) ?? []

          // Sex spoiler: sex[1] is real sex, only show if differs from apparent AND spoilerLevel >= 2
          const sexApparent = c.sex?.[0]
          const sexReal = c.sex?.[1]
          const hasSexSpoiler = !!(sexApparent && sexReal && sexReal !== sexApparent && sexReal !== "n")

          return (
            <Link key={c.id} href={`/${c.id}`} className="group block h-full">
              <div className={cn(
                "h-full flex flex-col rounded-lg overflow-hidden bg-surface border transition-all hover:scale-[1.02] duration-200",
                // Tint the edge of revealed spoiler characters so they stand out
                // from ordinary ones (yellow = minor, orange = major).
                charSpoiler === 2 ? "border-orange-500/50 hover:border-orange-500/70"
                : charSpoiler === 1 ? "border-yellow-500/40 hover:border-yellow-500/60"
                : "border-white/5 hover:border-white/20"
              )}>
                <div className="relative w-full aspect-3/4 shrink-0 bg-elevated">
                  {c.image ? (
                    <ImageWithFallback
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
                    {displayName(c, showOriginal)}
                  </p>

                  {sexApparent && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={cn(
                        (ICON.CHARACTER_SEX as Record<string, string>)[sexApparent],
                        "charsex-" + sexApparent
                      )} />
                      <span className="text-xs text-muted/80 truncate">
                        {enumLabel('CHARACTER_SEX', sexApparent)}
                        {hasSexSpoiler && spoiler.spoilerLevel < 2 && (
                          <span className="text-yellow-500/70"> (?)</span>
                        )}
                        {hasSexSpoiler && spoiler.spoilerLevel >= 2 && sexReal && (
                          <span className="text-yellow-400"> → {enumLabel('CHARACTER_SEX', sexReal)}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {vaEntries.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {vaEntries.map((v, i) => (
                        <p key={i} className="text-xs text-muted/80 truncate">
                          CV:{" "}
                          {/* The whole card is a <Link> to the character, so the
                              VA link swallows the card click and routes to the
                              staff page itself. */}
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/${v.staff.id}`) }}
                            className="hover:text-accent transition-colors"
                          >
                            {displayName(v.staff, showOriginal)}
                          </button>
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
            onClick={() => spoiler.setSpoilerLevel(1)}
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
            onClick={() => spoiler.setSpoilerLevel(2)}
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
      )}
    </div>
  )
}
