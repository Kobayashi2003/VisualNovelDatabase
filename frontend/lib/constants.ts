/**
 * Cross-cutting constants used by the frontend.
 * Grouped by concern: backend routes, UI defaults, and the collection-type
 * registry that ties high-level names (e.g. `"vn"`) to VNDB route prefixes.
 */


// ─── Backend routes ───────────────────────────────────────────────────────────
// Three services sit behind Next.js proxy routes. The constants below are the
// browser-side defaults; server-side code may override them via env vars in
// `api.ts`.

export const VNDB_BASE_URL = "/api/vndb"
export const IMGSERVE_BASE_URL = "/api/imgserve"
export const USERSERVE_BASE_URL = "/api/userserve"


// ─── UI defaults ──────────────────────────────────────────────────────────────

// Default page size for paginated lists / grids.
export const PAGE_LIMIT = 24


// ─── Collection-type registry ─────────────────────────────────────────────────
// Single source of truth that maps a high-level type name to the VNDB
// single-letter route prefix and a human-readable label. Adding a new entity
// type means appending a row here.

export const COLLECTION_TYPES = [
  { type: 'vn',        route: 'v', label: 'Visual Novel' },
  { type: 'release',   route: 'r', label: 'Release'      },
  { type: 'character', route: 'c', label: 'Character'    },
  { type: 'producer',  route: 'p', label: 'Producer'     },
  { type: 'staff',     route: 's', label: 'Staff'        },
  { type: 'tag',       route: 'g', label: 'Tag'          },
  { type: 'trait',     route: 'i', label: 'Trait'        },
] as const

export type CollectionTypeItem = typeof COLLECTION_TYPES[number]

// Lookup table form of `COLLECTION_TYPES` for O(1) access by type name.
export const COLLECTION_TYPE_MAP: Record<string, CollectionTypeItem> =
  Object.fromEntries(COLLECTION_TYPES.map(c => [c.type, c]))
