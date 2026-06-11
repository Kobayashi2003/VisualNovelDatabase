/** Helpers for working with collection marks and hydrating them into entities.
 *  Shared by the user-collections page, the kobayashi showcase, and the shelf
 *  rows — each used to re-spell these inline. */

import { numericId } from "./utils"
import type { Mark } from "./types"

/** Dedupe marks by id, keeping the most recently marked entry. Used when one
 *  entity can appear under several categories ("All" views) and we want the
 *  single latest mark to drive its date badge and ordering. */
export function dedupeLatestMarks(marks: Mark[]): Mark[] {
  const byId = new Map<number, Mark>()
  for (const m of marks) {
    const cur = byId.get(m.id)
    if (!cur || m.marked_at > cur.marked_at) byId.set(m.id, m)
  }
  return Array.from(byId.values())
}

/** Sort marks by `marked_at`. ISO timestamps compare correctly as strings. */
export function sortMarksByDate(marks: Mark[], order: "asc" | "desc"): Mark[] {
  return [...marks].sort((a, b) =>
    order === "asc" ? a.marked_at.localeCompare(b.marked_at) : b.marked_at.localeCompare(a.marked_at),
  )
}

/** Re-order hydrated entities to match a requested numeric-id order, dropping
 *  any that didn't resolve. Entities carry prefixed string ids ("v17"); a byIds
 *  fetch returns them unordered, so callers reorder to restore the mark order. */
export function reorderById<T extends { id: string }>(results: T[], ids: number[]): T[] {
  const byId = new Map(results.map(r => [numericId(r.id), r]))
  return ids.map(id => byId.get(id)).filter(Boolean) as T[]
}
