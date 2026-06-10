/** Helpers for reading a character's role/spoiler *within a specific VN*.
 *
 *  A character embeds an entry for every VN it appears in (`c.vns`), each with
 *  its own role and spoiler level. On a VN page the values shown must come from
 *  *that* VN's entry — using `c.vns[0]` is a bug: it's merely the first VN in
 *  the character's list, so a character that is e.g. "Main" in one VN but only
 *  "Appears" in another would be mis-grouped on the latter's page. */

import type { VN } from "./types"

type VNCharacter = VN["characters"][number]

/** The character's entry for `vnId`, falling back to the first entry if the VN
 *  isn't found (shouldn't happen for characters fetched for that VN, but keeps
 *  callers total). */
export function characterVNEntry(c: VNCharacter, vnId: string) {
  return c.vns.find(v => v.id === vnId) ?? c.vns[0]
}

export function characterRole(c: VNCharacter, vnId: string): string {
  return characterVNEntry(c, vnId)?.role ?? "appears"
}

export function characterSpoiler(c: VNCharacter, vnId: string): number {
  return characterVNEntry(c, vnId)?.spoiler ?? 0
}
