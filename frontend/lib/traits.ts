/** Shared grouping/filtering for a character's traits — used by the character
 *  page's trait panel and the dense VN character cards, so both order groups
 *  the same way and gate sexual/spoiler traits identically. */

import type { Character } from "./types"

export type CharTrait = Character["traits"][number]

// VNDB's canonical group ordering; unknown groups fall through alphabetically.
export const GROUP_ORDER = [
  "Hair", "Eyes", "Body", "Clothes", "Items", "Accessories",
  "Personality", "Role", "Engages in", "Engages in (Sexual)",
  "Subject of", "Subject of (Sexual)",
]

// Groups only shown when the sexual content level is "explicit".
export const SEXUAL_GROUPS = ["Engages in (Sexual)", "Subject of (Sexual)"]

export interface GroupedTraits {
  /** Group name → its visible traits, in canonical group order. */
  groups: Array<[string, CharTrait[]]>
  /** Counts of traits hidden purely by the current spoiler level. */
  hiddenMinor: number
  hiddenMajor: number
}

/** Filter by sexual level + spoiler level, then bucket into ordered groups. */
export function groupTraits(
  traits: CharTrait[],
  spoilerLevel: 0 | 1 | 2,
  sexualLevel: string,
): GroupedTraits {
  const isExplicit = sexualLevel === "explicit"

  const filtered = traits.filter(t => {
    if (SEXUAL_GROUPS.includes(t.group_name ?? "") && !isExplicit) return false
    return true
  })

  const visible = filtered.filter(t => t.spoiler <= spoilerLevel)
  const hiddenMinor = filtered.filter(t => t.spoiler === 1 && spoilerLevel < 1).length
  const hiddenMajor = filtered.filter(t => t.spoiler === 2 && spoilerLevel < 2).length

  const groupMap = new Map<string, CharTrait[]>()
  for (const t of visible) {
    const grp = t.group_name ?? "Other"
    const arr = groupMap.get(grp) ?? []
    arr.push(t)
    groupMap.set(grp, arr)
  }

  const allGroups = [...groupMap.keys()]
  const sortedGroups = [
    ...GROUP_ORDER.filter(g => groupMap.has(g)),
    ...allGroups.filter(g => !GROUP_ORDER.includes(g)).sort(),
  ]

  return {
    groups: sortedGroups.map(g => [g, groupMap.get(g)!]),
    hiddenMinor,
    hiddenMajor,
  }
}
