export const SORT_OPTIONS: Record<string, {
  both?: { value: string; label: string }[]
  remote?: { value: string; label: string }[]
  local?: { value: string; label: string }[]
}> = {
  v: {
    both: [
      { value: "id", label: "Id" },
      { value: "title", label: "Title" },
      { value: "released", label: "Release Date" },
      { value: "rating", label: "Bayesian Rating" },
      { value: "votecount", label: "Vote Count" },
    ],
    remote: [{ value: "searchrank", label: "Search Rank" }],
    local: [
      { value: "average", label: "Raw Vote Average" },
      { value: "length_minutes", label: "Length (Minutes)" },
      { value: "created_at", label: "Created At" },
    ],
  },
  r: {
    both: [
      { value: "id", label: "Id" },
      { value: "title", label: "Title" },
      { value: "released", label: "Release Date" },
    ],
    remote: [{ value: "searchrank", label: "Search Rank" }],
    local: [{ value: "minage", label: "Minimum Age" }, { value: "created_at", label: "Created At" }],
  },
  c: {
    both: [
      { value: "id", label: "Id" },
      { value: "name", label: "Name" },
    ],
    remote: [{ value: "searchrank", label: "Search Rank" }],
    local: [
      { value: "height", label: "Height" }, { value: "weight", label: "Weight" },
      { value: "age", label: "Age" }, { value: "created_at", label: "Created At" },
    ],
  },
  p: {
    both: [{ value: "id", label: "Id" }, { value: "name", label: "Name" }],
    remote: [{ value: "searchrank", label: "Search Rank" }],
    local: [{ value: "created_at", label: "Created At" }],
  },
  s: {
    both: [{ value: "id", label: "Id" }, { value: "name", label: "Name" }],
    remote: [{ value: "searchrank", label: "Search Rank" }],
    local: [{ value: "created_at", label: "Created At" }],
  },
  g: {
    both: [
      { value: "id", label: "Id" },
      { value: "name", label: "Name" },
      { value: "vn_count", label: "VN Count" },
    ],
    remote: [{ value: "searchrank", label: "Search Rank" }],
    local: [{ value: "created_at", label: "Created At" }],
  },
  i: {
    both: [
      { value: "id", label: "Id" },
      { value: "name", label: "Name" },
      { value: "char_count", label: "Character Count" },
    ],
    remote: [{ value: "searchrank", label: "Search Rank" }],
    local: [{ value: "group_name", label: "Group Name" }, { value: "created_at", label: "Created At" }],
  },
}

export function getSortOptions(type: string, from: string) {
  const t = SORT_OPTIONS[type]
  if (!t) return []
  if (from === "remote") return [...(t.both || []), ...(t.remote || [])]
  if (from === "local") return [...(t.both || []), ...(t.local || [])]
  return t.both || []
}

export function getDefaultSortOption(type: string, from: string): string {
  const opts = getSortOptions(type, from)
  return opts[0]?.value ?? "id"
}
