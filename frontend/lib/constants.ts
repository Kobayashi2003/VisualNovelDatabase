export const VNDB_BASE_URL = "/api/vndb"
export const IMGSERVE_BASE_URL = "/api/imgserve"
export const USERSERVE_BASE_URL = "/api/userserve"

export const COLLECTION_TYPES = [
  { type: 'vn',        route: 'v', label: 'Visual Novel', prefix: 'v' },
  { type: 'release',   route: 'r', label: 'Release',      prefix: 'r' },
  { type: 'character', route: 'c', label: 'Character',    prefix: 'c' },
  { type: 'producer',  route: 'p', label: 'Producer',     prefix: 'p' },
  { type: 'staff',     route: 's', label: 'Staff',        prefix: 's' },
  { type: 'tag',       route: 'g', label: 'Tag',          prefix: 'g' },
  { type: 'trait',     route: 'i', label: 'Trait',        prefix: 'i' },
] as const

export type CollectionTypeItem = typeof COLLECTION_TYPES[number]
