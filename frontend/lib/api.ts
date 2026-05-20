/** HTTP client for the VNDB proxy, image cache, and userserve backends. */

import {
  VN, Release, Character, Producer, Staff, Tag, Trait,
  VN_Small, Release_Small, Character_Small, Producer_Small,
  Staff_Small, Tag_Small, Trait_Small, User, Category, Mark,
  VNDBQueryParams, MarksQueryParams, PaginatedResponse,
} from "./types"
import {
  VNDB_BASE_URL, IMGSERVE_BASE_URL, USERSERVE_BASE_URL,
  COLLECTION_TYPE_MAP,
} from "./constants"


/* ─── Base URL resolution ──────────────────────────────────────────────────── */
// On the server the URL can be overridden via env vars (so SSR can hit the
// internal hostnames); on the client we always go through the Next.js proxy
// routes defined under `app/api/*`.

const getBaseUrl = (type: "vndb" | "imgserve" | "userserve") => {
  if (typeof window === "undefined") {
    switch (type) {
      case "vndb": return process.env.NEXT_PUBLIC_VNDB_BASE_URL || VNDB_BASE_URL
      case "imgserve": return process.env.NEXT_PUBLIC_IMGSERVE_BASE_URL || IMGSERVE_BASE_URL
      case "userserve": return process.env.NEXT_PUBLIC_USERSERVE_BASE_URL || USERSERVE_BASE_URL
    }
  } else {
    switch (type) {
      case "vndb": return VNDB_BASE_URL
      case "imgserve": return IMGSERVE_BASE_URL
      case "userserve": return USERSERVE_BASE_URL
    }
  }
}


/* ─── Generic VNDB fetchers ────────────────────────────────────────────────── */
// Two flavours: paginated list (`fetchVNDB`) and single-item by id
// (`fetchVNDBById`). Both accept an optional `processor` so callers can rewrite
// image URLs (or do other per-item massaging) before the data reaches React.

const fetchVNDB = async <T>(
  endpoint: string,
  params: VNDBQueryParams = {},
  processor?: (item: T) => T,
  abortSignal?: AbortSignal,
): Promise<PaginatedResponse<T>> => {
  const queryString = new URLSearchParams(params as Record<string, string>).toString()
  const url = `${getBaseUrl("vndb")}/${endpoint}?${queryString}`
  const response = await fetch(url, { method: "GET", signal: abortSignal })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  const data: PaginatedResponse<T> = await response.json()
  if (data.status === "ERROR") throw new Error(`VNDB error! status: ${data.status}`)
  if (data.status === "NOT_FOUND") {
    data.results = []
    data.more = false
    data.count = 0
  }
  return processor ? processVNDBResponse(data, processor) : data
}

const fetchVNDBById = async <T>(
  endpoint: string,
  params: VNDBQueryParams = {},
  processor?: (item: T) => T,
  abortSignal?: AbortSignal,
): Promise<T> => {
  const queryString = new URLSearchParams(params as Record<string, string>).toString()
  const url = `${getBaseUrl("vndb")}/${endpoint}?${queryString}`
  const response = await fetch(url, { method: "GET", signal: abortSignal })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  const data: PaginatedResponse<T> = await response.json()
  if (data.status === "ERROR" || data.status === "NOT_FOUND") throw new Error(`VNDB error! status: ${data.status}`)
  const result: T = data.results[0]
  if (!result) throw new Error(`VNDB error! status: ${data.status}`)
  return processor ? processor(result) : result
}


/* ─── Userserve fetcher ────────────────────────────────────────────────────── */
// Authenticated calls — attaches the bearer token from localStorage when
// present, and serialises the request body as JSON.

const fetchUserserve = async <T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
  abortSignal?: AbortSignal,
): Promise<T> => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(`${getBaseUrl("userserve")}/${endpoint}`, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: abortSignal,
  })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return await response.json()
}


/* ─── URL / route helpers ──────────────────────────────────────────────────── */

// Map a high-level collection name (e.g. `"vn"`) onto the single-letter VNDB
// route prefix (`"v"`). Falls back to the input if the type isn't registered.
function typeRoute(type: string): string {
  return COLLECTION_TYPE_MAP[type]?.route ?? type
}

// Rewrite VNDB-hosted image URLs to go through our imgserve proxy. Leaves
// unknown URL shapes untouched.
function convertToImgserveUrl(url: string): string {
  /* ─── TEMP imgserve login guard ─ delete this whole block to remove ────────── */
  // While logged out, return a black placeholder instead of the imgserve URL so
  // the browser never issues a request to imgserve. A 1x1 black PNG data URI is
  // used so next/image renders it without a configured remote host.
  if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mNgYGAAAAAEAAHI6uv5AAAAAElFTkSuQmCC"
  }
  /* ─── END TEMP ─────────────────────────────────────────────────────────────── */

  const match = url.match(/^https?:\/\/[^/]+\/(cv|sf|ch|cv\.t|sf\.t|ch\.t)\/\d+\/(\d+)\.jpg$/)
  if (!match) return url
  const [, type, id] = match
  return `${getBaseUrl("imgserve")}/img/${type}/${id}`
}


/* ─── Per-entity image post-processors ─────────────────────────────────────── */
// VNDB returns absolute image URLs; we mirror them through imgserve so the
// browser hits our cache. One processor per entity that carries images.

function processVNImages(vn: VN): VN {
  return {
    ...vn,
    image: vn.image && { ...vn.image, url: convertToImgserveUrl(vn.image.url), thumbnail: convertToImgserveUrl(vn.image.thumbnail) },
    characters: vn.characters.map(c => ({ ...c, image: c.image && { ...c.image, url: convertToImgserveUrl(c.image.url) } })),
    screenshots: vn.screenshots.map(s => ({ ...s, url: convertToImgserveUrl(s.url), thumbnail: convertToImgserveUrl(s.thumbnail) })),
  }
}

function processCharacterImages(character: Character): Character {
  return { ...character, image: character.image && { ...character.image, url: convertToImgserveUrl(character.image.url) } }
}

function processReleaseImages(release: Release): Release {
  return { ...release, images: release.images.map(img => ({ ...img, url: convertToImgserveUrl(img.url), thumbnail: convertToImgserveUrl(img.thumbnail) })) }
}

function processSmallVNImages(vn: VN_Small): VN_Small {
  return { ...vn, image: vn.image && { ...vn.image, url: convertToImgserveUrl(vn.image.url), thumbnail: convertToImgserveUrl(vn.image.thumbnail) } }
}

function processSmallCharacterImages(character: Character_Small): Character_Small {
  return { ...character, image: character.image && { ...character.image, url: convertToImgserveUrl(character.image.url) } }
}

// Maps a per-item processor across the `results` array of a paginated response.
function processVNDBResponse<T>(response: PaginatedResponse<T>, processor: (item: T) => T): PaginatedResponse<T> {
  return { ...response, results: response.results.map(processor) }
}


/* ─── Public API surface ───────────────────────────────────────────────────── */

export const api = {

  /* VNDB: paginated, large */
  vn: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
    params.size = "large"; return fetchVNDB<VN>(`v`, params, processVNImages, abortSignal)
  },
  release: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
    params.size = "large"; return fetchVNDB<Release>(`r`, params, processReleaseImages, abortSignal)
  },
  producer: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
    params.size = "large"; return fetchVNDB<Producer>(`p`, params, undefined, abortSignal)
  },
  character: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
    params.size = "large"; return fetchVNDB<Character>(`c`, params, processCharacterImages, abortSignal)
  },
  staff: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
    params.size = "large"; return fetchVNDB<Staff>(`s`, params, undefined, abortSignal)
  },
  tag: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
    params.size = "large"; return fetchVNDB<Tag>(`g`, params, undefined, abortSignal)
  },
  trait: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
    params.size = "large"; return fetchVNDB<Trait>(`i`, params, undefined, abortSignal)
  },

  /* VNDB: single item by id, large */
  by_id: {
    vn: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "large"; return fetchVNDBById<VN>(`v${id}`, params, processVNImages, abortSignal)
    },
    release: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "large"; return fetchVNDBById<Release>(`r${id}`, params, processReleaseImages, abortSignal)
    },
    character: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "large"; return fetchVNDBById<Character>(`c${id}`, params, processCharacterImages, abortSignal)
    },
    producer: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "large"; return fetchVNDBById<Producer>(`p${id}`, params, undefined, abortSignal)
    },
    staff: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "large"; return fetchVNDBById<Staff>(`s${id}`, params, undefined, abortSignal)
    },
    tag: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "large"; return fetchVNDBById<Tag>(`g${id}`, params, undefined, abortSignal)
    },
    trait: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "large"; return fetchVNDBById<Trait>(`i${id}`, params, undefined, abortSignal)
    },
  },

  /* VNDB: small variants (list cards, autocomplete, …) */
  small: {
    vn: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "small"; return fetchVNDB<VN_Small>(`v`, params, processSmallVNImages, abortSignal)
    },
    release: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "small"; return fetchVNDB<Release_Small>(`r`, params, undefined, abortSignal)
    },
    character: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "small"; return fetchVNDB<Character_Small>(`c`, params, processSmallCharacterImages, abortSignal)
    },
    producer: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "small"; return fetchVNDB<Producer_Small>(`p`, params, undefined, abortSignal)
    },
    staff: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "small"; return fetchVNDB<Staff_Small>(`s`, params, undefined, abortSignal)
    },
    tag: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "small"; return fetchVNDB<Tag_Small>(`g`, params, undefined, abortSignal)
    },
    trait: (params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
      params.size = "small"; return fetchVNDB<Trait_Small>(`i`, params, undefined, abortSignal)
    },

    by_id: {
      vn: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        params.size = "small"; return fetchVNDBById<VN_Small>(`v${id}`, params, processSmallVNImages, abortSignal)
      },
      release: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        params.size = "small"; return fetchVNDBById<Release_Small>(`r${id}`, params, undefined, abortSignal)
      },
      character: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        params.size = "small"; return fetchVNDBById<Character_Small>(`c${id}`, params, processSmallCharacterImages, abortSignal)
      },
      producer: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        params.size = "small"; return fetchVNDBById<Producer_Small>(`p${id}`, params, undefined, abortSignal)
      },
      staff: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        params.size = "small"; return fetchVNDBById<Staff_Small>(`s${id}`, params, undefined, abortSignal)
      },
      tag: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        params.size = "small"; return fetchVNDBById<Tag_Small>(`g${id}`, params, undefined, abortSignal)
      },
      trait: (id: number, params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        params.size = "small"; return fetchVNDBById<Trait_Small>(`i${id}`, params, undefined, abortSignal)
      },
    },

    // Batched fetch — short-circuits on empty lists so callers don't have to.
    byIds: {
      vn: (ids: number[], params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        if (!ids.length) return Promise.resolve({ results: [] as VN_Small[], status: 'OK', source: 'local', more: false, count: 0 })
        return fetchVNDB<VN_Small>(`v`, { ...params, size: "small", id: ids.map(id => `v${id}`).join(",") }, processSmallVNImages, abortSignal)
      },
      release: (ids: number[], params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        if (!ids.length) return Promise.resolve({ results: [] as Release_Small[], status: 'OK', source: 'local', more: false, count: 0 })
        return fetchVNDB<Release_Small>(`r`, { ...params, size: "small", id: ids.map(id => `r${id}`).join(",") }, undefined, abortSignal)
      },
      character: (ids: number[], params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        if (!ids.length) return Promise.resolve({ results: [] as Character_Small[], status: 'OK', source: 'local', more: false, count: 0 })
        return fetchVNDB<Character_Small>(`c`, { ...params, size: "small", id: ids.map(id => `c${id}`).join(",") }, processSmallCharacterImages, abortSignal)
      },
      producer: (ids: number[], params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        if (!ids.length) return Promise.resolve({ results: [] as Producer_Small[], status: 'OK', source: 'local', more: false, count: 0 })
        return fetchVNDB<Producer_Small>(`p`, { ...params, size: "small", id: ids.map(id => `p${id}`).join(",") }, undefined, abortSignal)
      },
      staff: (ids: number[], params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        if (!ids.length) return Promise.resolve({ results: [] as Staff_Small[], status: 'OK', source: 'local', more: false, count: 0 })
        return fetchVNDB<Staff_Small>(`s`, { ...params, size: "small", id: ids.map(id => `s${id}`).join(",") }, undefined, abortSignal)
      },
      tag: (ids: number[], params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        if (!ids.length) return Promise.resolve({ results: [] as Tag_Small[], status: 'OK', source: 'local', more: false, count: 0 })
        return fetchVNDB<Tag_Small>(`g`, { ...params, size: "small", id: ids.map(id => `g${id}`).join(",") }, undefined, abortSignal)
      },
      trait: (ids: number[], params: VNDBQueryParams = {}, abortSignal?: AbortSignal) => {
        if (!ids.length) return Promise.resolve({ results: [] as Trait_Small[], status: 'OK', source: 'local', more: false, count: 0 })
        return fetchVNDB<Trait_Small>(`i`, { ...params, size: "small", id: ids.map(id => `i${id}`).join(",") }, undefined, abortSignal)
      },
    },
  },

  /* Userserve: auth */
  user: {
    login: (username: string, password: string, abortSignal?: AbortSignal) =>
      fetchUserserve<{ access_token: string; username: string }>("login", "POST", { username, password }, abortSignal),
    register: (username: string, password: string, abortSignal?: AbortSignal) =>
      fetchUserserve<{ access_token: string; username: string }>("register", "POST", { username, password }, abortSignal),
    changePassword: (oldPassword: string, newPassword: string, abortSignal?: AbortSignal) =>
      fetchUserserve<{ message: string }>("change_password", "POST", { old_password: oldPassword, new_password: newPassword }, abortSignal),
    get: (username: string, abortSignal?: AbortSignal) =>
      fetchUserserve<User>(`u${username}`, "GET", undefined, abortSignal),
  },

  /* Userserve: categories and their marks */
  category: {
    get: (type: string, abortSignal?: AbortSignal) =>
      fetchUserserve<Category[]>(`${typeRoute(type)}/c`, "GET", undefined, abortSignal),
    create: (type: string, categoryName: string, abortSignal?: AbortSignal) =>
      fetchUserserve<Category>(`${typeRoute(type)}/c`, "POST", { category_name: categoryName }, abortSignal),
    update: (type: string, categoryId: number, newCategoryName: string, abortSignal?: AbortSignal) =>
      fetchUserserve<Category>(`${typeRoute(type)}/c${categoryId}`, "PUT", { category_name: newCategoryName }, abortSignal),
    delete: (type: string, categoryId: number, abortSignal?: AbortSignal) =>
      fetchUserserve<{ message: string }>(`${typeRoute(type)}/c${categoryId}`, "DELETE", undefined, abortSignal),

    addMark: (type: string, categoryId: number, markId: number, abortSignal?: AbortSignal) =>
      fetchUserserve<Category>(`${typeRoute(type)}/c${categoryId}/m`, "POST", { mark_id: markId }, abortSignal),
    removeMark: (type: string, categoryId: number, markId: number, abortSignal?: AbortSignal) =>
      fetchUserserve<Category>(`${typeRoute(type)}/c${categoryId}/m`, "DELETE", { mark_id: markId }, abortSignal),
    removeMarks: (type: string, categoryId: number, markIds: number[], abortSignal?: AbortSignal) =>
      fetchUserserve<Category>(`${typeRoute(type)}/c${categoryId}/m`, "DELETE", { mark_ids: markIds }, abortSignal),
    moveMarks: (type: string, fromCategoryId: number, toCategoryId: number, markIds: number[], abortSignal?: AbortSignal) =>
      fetchUserserve<{ message: string }>(`${typeRoute(type)}/c/m`, "PUT", { category_from_id: fromCategoryId, category_to_id: toCategoryId, mark_ids: markIds }, abortSignal),
    getMarks: (type: string, params: MarksQueryParams = {}, abortSignal?: AbortSignal) => {
      const query = new URLSearchParams(params as Record<string, string>).toString()
      return fetchUserserve<{ results: Mark[]; count?: number; more: boolean }>(
        `${typeRoute(type)}/c/m?${query}`, "GET", undefined, abortSignal,
      )
    },
  },
}
