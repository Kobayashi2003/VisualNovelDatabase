/** Linked-VNs list on the Release detail page. */
"use client"

import Link from "next/link"
import { enumLabel } from "@/lib/enums"
import { displayTitle } from "@/lib/original"
import type { Release } from "@/lib/types"
import { useSearchContext } from "@/context/SearchContext"

export function ReleaseLinkedVNs({ vns }: { vns: Release["vns"] }) {
  const { showOriginal } = useSearchContext()
  return (
    <div className="flex flex-col gap-2">
      {vns.map(vn => (
        <Link
          key={vn.id}
          href={`/${vn.id}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-white/5 hover:bg-white/5 hover:border-white/10 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{displayTitle(vn, showOriginal)}</p>
          </div>
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 shrink-0">
            {enumLabel('RTYPE', vn.rtype)}
          </span>
        </Link>
      ))}
    </div>
  )
}
