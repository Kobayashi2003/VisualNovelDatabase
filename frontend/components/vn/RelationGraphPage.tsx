/** Relation-graph page shell: a full-bleed canvas with a frosted header overlay.
 *  Fetches the connected component for a VN and hands it to the client-only
 *  graph view (React Flow can't render on the server). */
"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useState } from "react"
import { ArrowLeft, Share2 } from "lucide-react"

import { api } from "@/lib/api"
import { useEntity } from "@/hooks/useEntity"
import { useSearchContext } from "@/context/SearchContext"
import { displayTitle } from "@/lib/original"
import { Loading } from "@/components/status/Loading"
import { ErrorPanel } from "@/components/status/ErrorPanel"
import type { RelationGraph, VNDBQueryParams } from "@/lib/types"

const RelationGraphView = dynamic(
  () => import("./RelationGraphView").then(m => m.RelationGraphView),
  {
    ssr: false,
    // Centered, matching the data-loading state, so it doesn't flash at the top
    // edge in the moment between fetch-done and the chunk loading.
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loading message="Loading graph..." />
      </div>
    ),
  },
)

export function RelationGraphPage({ id }: { id: number }) {
  // Bumping the key re-creates the fetcher, which makes useEntity refetch.
  const [reloadKey, setReloadKey] = useState(0)
  const fetcher = useCallback(
    (vid: number, params: VNDBQueryParams, signal: AbortSignal) => {
      void reloadKey
      return api.relationGraph(vid, params, signal)
    },
    [reloadKey],
  )
  const { data: graph, loading, error } = useEntity<RelationGraph>(id, fetcher)
  const { showOriginal } = useSearchContext()

  const rootId = graph?.root ?? `v${id}`
  const rootNode = graph?.nodes.find(n => n.id === graph.root)

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "calc(100vh - var(--header-h, 4rem))" }}
    >
      {/* Slightly-dark frosted mask over the page background, so the graph reads
          against a calm backdrop rather than the busy cover image. */}
      <div className="pointer-events-none absolute inset-0 bg-background/45 backdrop-blur-md" />
      {/* Ambient Spotify-green glow on top of the mask. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(29,185,84,0.10),transparent_55%)]" />

      {/* Frosted header overlay — floats above the canvas, fades into it. */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-linear-to-b from-background/90 via-background/50 to-transparent px-5 pb-8 pt-3">
        <Link
          href={`/${rootId}`}
          aria-label="Back to visual novel"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface/70 text-muted backdrop-blur-md transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent/90">
            <Share2 className="h-3 w-3" />
            Relation graph
          </p>
          <h1 className="truncate text-xl font-bold leading-tight text-white">
            {rootNode ? displayTitle(rootNode, showOriginal) : `v${id}`}
          </h1>
        </div>

        {graph && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {graph.truncated && (
              <span className="rounded-full bg-yellow-500/20 px-2.5 py-1 text-[11px] font-medium text-yellow-400">
                Truncated
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-surface/70 px-2.5 py-1 text-[11px] text-muted backdrop-blur-md">
              {graph.nodes.length} titles
            </span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="absolute inset-0">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <Loading message="Building graph..." />
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center">
            <ErrorPanel message={error} />
          </div>
        )}
        {graph && <RelationGraphView graph={graph} onRefresh={() => setReloadKey(k => k + 1)} />}
      </div>
    </div>
  )
}
