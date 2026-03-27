"use client"

import { useState, useEffect } from "react"
import { VNsCardsGrid } from "@/components/card/CardsGrid"
import { PaginationButtons } from "@/components/button/PaginationButtons"
import { Loading } from "@/components/status/Loading"
import { api } from "@/lib/api"
import { VN_Small } from "@/lib/types"

interface RelatedVNsPanelProps {
  title: string
  searchParams: Record<string, string>
}

export function RelatedVNsPanel({ title, searchParams }: RelatedVNsPanelProps) {
  const [vns, setVns] = useState<VN_Small[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [count, setCount] = useState(0)
  const limit = 24

  useEffect(() => {
    let aborted = false
    const controller = new AbortController()

    const fetchVNs = async () => {
      setLoading(true)
      try {
        const data = await api.small.vn(
          { ...searchParams, page, limit, count: "true" },
          controller.signal
        )
        if (!aborted) {
          setVns(data.results)
          setMore(data.more)
          setCount(data.count)
        }
      } catch {
        if (!aborted) {
          setVns([])
          setMore(false)
          setCount(0)
        }
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    fetchVNs()
    return () => { aborted = true; controller.abort() }
  }, [page, JSON.stringify(searchParams)])

  if (!loading && vns.length === 0 && page === 1) return null

  const totalPages = Math.ceil(count / limit)

  return (
    <div className="bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {count > 0 && <span className="text-xs text-white/40">{count} results</span>}
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loading message="" />
        </div>
      ) : (
        <>
          <VNsCardsGrid vns={vns} cardType="image" layout="grid" />
          {totalPages > 1 && (
            <div className="flex justify-center">
              <PaginationButtons currentPage={page} onPageChange={setPage} totalPages={totalPages} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
