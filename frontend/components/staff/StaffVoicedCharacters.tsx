/** Voiced characters section for the Staff detail page. */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { PAGE_LIMIT } from "@/lib/constants"
import type { Character_Small } from "@/lib/types"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { CharactersCardsGrid } from "@/components/card/CardsGrid"
import { PaginationButtons } from "@/components/button/PaginationButtons"

interface StaffVoicedCharactersProps {
  staffId: string
  sexualLevel: "safe" | "suggestive" | "explicit"
  violenceLevel: "tame" | "violent" | "brutal"
}

export function StaffVoicedCharacters({ staffId, sexualLevel, violenceLevel }: StaffVoicedCharactersProps) {
  const [characters, setCharacters] = useState<Character_Small[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.small.character({ seiyuu: staffId, sort: "name", limit: PAGE_LIMIT, page })
      .then(res => {
        if (cancelled) return
        setCharacters(res.results)
        setTotalPages(Math.ceil(res.count / PAGE_LIMIT))
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [staffId, page])

  if (loading) return <Loading message="Loading characters..." />
  if (error) return <ErrorStatus message={error} />
  if (characters.length === 0) return <p className="text-sm text-muted">No voiced characters found.</p>

  return (
    <div className="flex flex-col gap-4">
      <CharactersCardsGrid
        characters={characters}
        sexualLevel={sexualLevel}
        violenceLevel={violenceLevel}
      />
      <PaginationButtons totalPages={totalPages} currentPage={page} onPageChange={setPage} />
    </div>
  )
}
