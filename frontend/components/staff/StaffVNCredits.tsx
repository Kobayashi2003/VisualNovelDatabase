/** VN credits section for the Staff detail page. */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { PAGE_LIMIT } from "@/lib/constants"
import type { VN_Small } from "@/lib/types"
import { Loading } from "@/components/status/Loading"
import { Error as ErrorStatus } from "@/components/status/Error"
import { VNsCardsGrid } from "@/components/card/CardsGrid"
import { PaginationButtons } from "@/components/button/PaginationButtons"

interface StaffVNCreditsProps {
  staffId: string
  sexualLevel: "safe" | "suggestive" | "explicit"
  violenceLevel: "tame" | "violent" | "brutal"
}

export function StaffVNCredits({ staffId, sexualLevel, violenceLevel }: StaffVNCreditsProps) {
  const [vns, setVns] = useState<VN_Small[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.small.vn({ staff: staffId, sort: "released", reverse: true, limit: PAGE_LIMIT, page })
      .then(res => {
        if (cancelled) return
        setVns(res.results)
        setTotalPages(Math.ceil(res.count / PAGE_LIMIT))
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [staffId, page])

  if (loading) return <Loading message="Loading visual novels..." />
  if (error) return <ErrorStatus message={error} />
  if (vns.length === 0) return <p className="text-sm text-muted">No visual novels found.</p>

  return (
    <div className="flex flex-col gap-4">
      <VNsCardsGrid vns={vns} sexualLevel={sexualLevel} violenceLevel={violenceLevel} />
      <PaginationButtons totalPages={totalPages} currentPage={page} onPageChange={setPage} />
    </div>
  )
}
