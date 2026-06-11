/** Pure config for the user-collections page: per-entity sort options, the view
 *  modes, and small lookups. Kept out of the page component so the tables read as
 *  data, not render code. */

import { COLLECTION_TYPE_MAP } from "./constants"

// Collection-specific sorts (note: "date_added" is local-only).
export const SORT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  vn:        [{ value: "date_added", label: "Date Added" }, { value: "title", label: "Title" }, { value: "rating", label: "Rating" }, { value: "released", label: "Released" }, { value: "my_rating", label: "My Rating" }],
  release:   [{ value: "date_added", label: "Date Added" }, { value: "title", label: "Title" }, { value: "released", label: "Released" }, { value: "my_rating", label: "My Rating" }],
  character: [{ value: "date_added", label: "Date Added" }, { value: "name", label: "Name" }, { value: "my_rating", label: "My Rating" }],
  producer:  [{ value: "date_added", label: "Date Added" }, { value: "name", label: "Name" }, { value: "my_rating", label: "My Rating" }],
  staff:     [{ value: "date_added", label: "Date Added" }, { value: "name", label: "Name" }, { value: "my_rating", label: "My Rating" }],
  tag:       [{ value: "date_added", label: "Date Added" }, { value: "name", label: "Name" }, { value: "my_rating", label: "My Rating" }],
  trait:     [{ value: "date_added", label: "Date Added" }, { value: "name", label: "Name" }, { value: "my_rating", label: "My Rating" }],
}

// Sorts computed locally from marks/ratings rather than by VNDB. They have no
// honest answer alongside a text search (VNDB does the filtering), so they are
// disabled while a search is active.
export const LOCAL_SORTS = new Set(["date_added", "my_rating"])

export type ViewMode = "grid" | "list" | "compact" | "shelf"
export const VIEW_MODES: ViewMode[] = ["grid", "list", "compact", "shelf"]

// "Shelf" mode is offered only for image-backed entities viewed across all
// collections — text-only types make a thin horizontal strip look empty.
export const SHELF_SUPPORTED_TYPES = new Set(["vn", "character"])

// Card-id prefix for an entity type ("vn" → "v"), used to key marks/ratings maps.
export function prefixForType(type: string): string {
  return COLLECTION_TYPE_MAP[type]?.route ?? ""
}
