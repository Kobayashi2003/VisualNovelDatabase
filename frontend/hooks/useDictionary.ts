/** Batch English → Japanese name lookups against transserve, with a shared cache.
 *
 * Used by tag / trait chips in original-text mode: pass the names to display
 * plus `enabled` (the SearchContext `showOriginal` flag) and get back a
 * resolver. The resolver returns the Japanese translation once it has loaded,
 * the original English word while a request is in flight or when there is no
 * dictionary entry, and the original word verbatim whenever `enabled` is false.
 *
 * The cache is module-level, so translations are fetched once and reused across
 * every chip list and across client-side navigations for the page session.
 */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"

// Normalized source word -> display string (translation, or the original word
// when transserve has no entry — the backend's fallback already echoes it).
const cache = new Map<string, string>()

const normalize = (word: string) => word.trim().replace(/\s+/g, " ").toLowerCase()

export function useDictionary(words: string[], enabled: boolean): (word: string) => string {
  // Bumped when a batch resolves so consumers re-render with the new names.
  const [, setVersion] = useState(0)

  // Words we still need a translation for (deduped, order-independent).
  const missing = enabled
    ? Array.from(new Set(words.filter(w => w && !cache.has(normalize(w)))))
    : []
  // Stable effect key. The "\x1f" unit separator keeps distinct word sets from
  // aliasing to the same key (e.g. ["ab","c"] vs ["a","bc"] → both "abc").
  const missingKey = missing.map(normalize).sort().join("\x1f")

  useEffect(() => {
    if (!enabled || missing.length === 0) return
    const controller = new AbortController()
    api.translate.dictionary(missing, true, controller.signal)
      .then(({ results }) => {
        for (const word of missing) {
          const target = results[word]
          cache.set(normalize(word), typeof target === "string" && target ? target : word)
        }
        setVersion(v => v + 1)
      })
      .catch(() => { /* leave uncached — the resolver falls back to the original */ })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, missingKey])

  return (word: string) => (enabled ? cache.get(normalize(word)) ?? word : word)
}
