export const VNDB_BASE_URL = "/api/vndb"
export const IMGSERVE_BASE_URL = "/api/imgserve"
export const USERSERVE_BASE_URL = "/api/userserve"

export const PAGE_LIMIT = 24

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

export const COLLECTION_TYPE_MAP: Record<string, CollectionTypeItem> =
  Object.fromEntries(COLLECTION_TYPES.map(c => [c.type, c]))
