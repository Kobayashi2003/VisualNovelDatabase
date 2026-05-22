/** Developer / publisher lists on the Release detail page. */
"use client"

import Link from "next/link"
import { displayName } from "@/lib/original"
import type { Release } from "@/lib/types"
import { useSearchContext } from "@/context/SearchContext"

type ReleaseProducerList = NonNullable<Release["producers"]>

export function ReleaseProducers({ producers }: { producers: ReleaseProducerList }) {
  const { showOriginal } = useSearchContext()
  const developers = producers.filter(p => p.developer)
  const publishers = producers.filter(p => p.publisher)

  const renderList = (list: ReleaseProducerList) => (
    <div className="flex flex-col gap-2">
      {list.map(p => (
        <Link
          key={p.id}
          href={`/${p.id}`}
          className="flex items-center px-3 py-2 rounded-lg bg-surface border border-white/5 hover:bg-white/5 hover:border-white/10 transition-colors"
        >
          <p className="text-sm text-white truncate">{displayName(p, showOriginal)}</p>
        </Link>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {developers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Developer</p>
          {renderList(developers)}
        </div>
      )}
      {publishers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Publisher</p>
          {renderList(publishers)}
        </div>
      )}
    </div>
  )
}
