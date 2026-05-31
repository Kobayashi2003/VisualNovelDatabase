/** Lazily fetch a single character's full payload (traits, physical stats,
 *  aliases, description, voice actors) on demand — the fields the VN page's
 *  embedded `characters[]` doesn't carry.
 *
 *  Backed by module-level caches + an in-flight map so a character is fetched at
 *  most once per session and shared across every card (slider, expand view,
 *  re-opens), keeping requests to a minimum. The hook derives its return values
 *  straight from those caches and only bumps a counter (asynchronously, when a
 *  fetch settles) to re-render. */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { Character } from "@/lib/types"

const cache = new Map<string, Character>()
const errorCache = new Map<string, string>()
const inflight = new Map<string, Promise<Character>>()

/** `charId` is the slug form ("c521"); pass `null` to fetch nothing. */
export function useCharacterFull(charId: string | null) {
  const [, bump] = useState(0)

  useEffect(() => {
    if (!charId || cache.has(charId) || errorCache.has(charId)) return
    let active = true

    let promise = inflight.get(charId)
    if (!promise) {
      const numericId = parseInt(charId.replace(/^c/, ""), 10)
      promise = api.by_id.character(numericId)
        .then(c => { cache.set(charId, c); inflight.delete(charId); return c })
        .catch(e => { inflight.delete(charId); throw e })
      inflight.set(charId, promise)
    }

    promise
      .then(() => { if (active) bump(v => v + 1) })
      .catch(e => {
        errorCache.set(charId, e instanceof Error ? e.message : String(e))
        if (active) bump(v => v + 1)
      })

    return () => { active = false }
  }, [charId])

  const character = charId ? cache.get(charId) ?? null : null
  const error = charId ? errorCache.get(charId) ?? null : null
  const loading = !!charId && !character && !error
  return { character, loading, error }
}
