/** The React Flow custom node, custom edge and self-drawn overview for the
 *  relation graph. Grouped together because they're the canvas's rendered
 *  primitives (and share the `EdgeSelectContext` bridge); the view in
 *  `RelationGraphView` wires them up and owns all the interaction state. */
"use client"

import {
  createContext, useContext, useMemo, useRef,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  Handle, Position, BaseEdge, EdgeLabelRenderer,
  useReactFlow, useStore,
  type NodeProps, type EdgeProps,
} from "@xyflow/react"

import { cn } from "@/lib/utils"
import { displayTitle } from "@/lib/original"
import { useSearchContext } from "@/context/SearchContext"
import { ImageWithFallback } from "@/components/common/ImageWithFallback"
import { NODE, roundedPath, type VNFlowNode, type RelationFlowEdge } from "../_lib/graph-layout"


/* ─── Node ─────────────────────────────────────────────────────────────────── */

// Devstatus dot (VNDB vn.devstatus: 0 finished / 1 in dev / 2 cancelled).
const DEVSTATUS_DOT: Record<number, string> = {
  0: "bg-green-400", 1: "bg-yellow-400", 2: "bg-red-400",
}

function VNGraphNode({ data }: NodeProps<VNFlowNode>) {
  const { showOriginal } = useSearchContext()
  const { node, isRoot, showCovers, dim, pulse, pick } = data
  const title = displayTitle(node, showOriginal)
  const size = showCovers ? NODE.covers : NODE.noCovers
  const cover = node.image?.thumbnail || node.image?.url

  return (
    <div
      style={{ width: size.w, height: size.h, opacity: dim ? 0.12 : 1 }}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer",
        "border backdrop-blur-sm transition-[opacity,transform,border-color] duration-200",
        "bg-linear-to-br from-elevated/95 to-surface/95 shadow-lg shadow-black/30",
        isRoot ? "border-accent ring-2 ring-accent/40" : "border-white/10 hover:border-white/40 hover:-translate-y-0.5",
        // Path endpoint pick — overrides the resting border so it reads while choosing.
        pick && "!border-sky-400 ring-2 ring-sky-400/60",
      )}
    >
      {/* Locate pulse — a sonar ring keyed so it restarts on each tap. */}
      {pulse !== undefined && (
        <span key={pulse} className="pointer-events-none absolute -inset-0.5 rounded-xl ring-2 ring-accent animate-ping" />
      )}

      <Handle type="target" position={Position.Top} className="!opacity-0" />

      {isRoot && (
        <span className="absolute top-1 right-1 rounded-full bg-accent/90 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-black">
          Root
        </span>
      )}

      {pick && (
        <span className="absolute bottom-1 right-1 rounded-full bg-sky-400/90 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-black">
          Path
        </span>
      )}

      {showCovers && (
        <div className="relative h-full aspect-3/4 shrink-0 overflow-hidden rounded-md bg-surface">
          {cover && <ImageWithFallback src={cover} alt="" fill sizes="48px" className="object-cover" />}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", DEVSTATUS_DOT[node.devstatus] ?? "bg-white/30")} />
          <p className="min-w-0 text-xs font-semibold text-white leading-snug line-clamp-2" title={title}>{title}</p>
        </div>
        {node.released && <p className="mt-0.5 pl-3 text-[10px] tabular-nums text-muted">{node.released}</p>}
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}

export const nodeTypes = { vn: VNGraphNode }


/* ─── Edge ─────────────────────────────────────────────────────────────────── */

// Lets a custom edge toggle focus on itself (edges aren't React children of the
// view, so this bridges across the ReactFlow boundary).
export const EdgeSelectContext = createContext<((id: string) => void) | null>(null)

const EDGE_HIT_WIDTH = 18   // generous, easy-to-click stroke
const DRAG_THRESHOLD = 4    // px of movement that turns a click into a pan

function RelationEdge({ id, data, label, style, markerEnd }: EdgeProps<RelationFlowEdge>) {
  const path = useMemo(() => roundedPath(data?.points ?? []), [data?.points])
  const onSelect = useContext(EdgeSelectContext)
  const { getViewport, setViewport } = useReactFlow()
  // Distinguish a click (→ focus) from a drag (→ pan the canvas) by how far the
  // pointer travels, so a full-width hit area no longer blocks panning.
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null)

  const onPointerDown = (e: ReactPointerEvent<SVGPathElement>) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const vp = getViewport()
    drag.current = { sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y, moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent<SVGPathElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    d.moved = true
    setViewport({ x: d.vx + dx, y: d.vy + dy, zoom: getViewport().zoom })
  }
  const onPointerUp = (e: ReactPointerEvent<SVGPathElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (drag.current && !drag.current.moved) onSelect?.(id)
    drag.current = null
  }

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} interactionWidth={0} />
      {/* Own interaction stroke: full-width hit, but click vs drag is resolved by
          the handlers above rather than by shrinking the target. */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={EDGE_HIT_WIDTH}
        style={{ cursor: "pointer", pointerEvents: "stroke" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {label != null && data && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-md border border-accent/60 bg-black/90 px-1.5 py-0.5 text-[9px] font-bold leading-none text-accent-hover shadow"
            style={{ transform: `translate(-50%, -50%) translate(${data.labelX}px, ${data.labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const edgeTypes = { relation: RelationEdge }


/* ─── Overview (self-contained minimap) ────────────────────────────────────── */
// Built from the nodes we already control, so it always renders — the stock
// React Flow MiniMap only draws measured nodes and kept coming up blank.

const OV_W = 230, OV_H = 120, OV_PAD = 8

export function Overview({ nodes, rootId }: { nodes: VNFlowNode[]; rootId: string }) {
  const tx = useStore(s => s.transform[0])
  const ty = useStore(s => s.transform[1])
  const tz = useStore(s => s.transform[2])
  const flowW = useStore(s => s.width)
  const flowH = useStore(s => s.height)
  const { setCenter } = useReactFlow<VNFlowNode>()
  const dragging = useRef(false)

  // bbox → fit transform (recomputed only when the node set changes).
  const layout = useMemo(() => {
    if (nodes.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y)
      maxX = Math.max(maxX, n.position.x + (n.width ?? 0)); maxY = Math.max(maxY, n.position.y + (n.height ?? 0))
    }
    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY)
    const scale = Math.min((OV_W - 2 * OV_PAD) / bw, (OV_H - 2 * OV_PAD) / bh)
    return {
      scale,
      ox: OV_PAD + (OV_W - 2 * OV_PAD - bw * scale) / 2 - minX * scale,
      oy: OV_PAD + (OV_H - 2 * OV_PAD - bh * scale) / 2 - minY * scale,
    }
  }, [nodes])

  // Node rects memoised so a pan (transform change) only redraws the viewport box.
  const rects = useMemo(() => {
    if (!layout) return null
    const { scale, ox, oy } = layout
    return nodes.map(n => (
      <rect
        key={n.id}
        x={n.position.x * scale + ox}
        y={n.position.y * scale + oy}
        width={(n.width ?? 0) * scale}
        height={(n.height ?? 0) * scale}
        rx={1.5}
        fill={n.id === rootId ? "#1DB954" : "#6b7280"}
      />
    ))
  }, [nodes, layout, rootId])

  if (!layout) return null
  const { scale, ox, oy } = layout
  const vx = (-tx / tz) * scale + ox
  const vy = (-ty / tz) * scale + oy
  const vw = (flowW / tz) * scale
  const vh = (flowH / tz) * scale

  // Click or drag anywhere on the overview pans the main viewport to that spot.
  const panTo = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setCenter(((e.clientX - r.left) - ox) / scale, ((e.clientY - r.top) - oy) / scale, { zoom: tz, duration: 0 })
  }
  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    e.stopPropagation()
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    panTo(e)
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => { if (dragging.current) panTo(e) }
  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <svg
      width={OV_W}
      height={OV_H}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="block touch-none cursor-grab rounded-lg border border-white/10 active:cursor-grabbing"
      style={{ background: "#0a0a0a" }}
    >
      {rects}
      <rect x={vx} y={vy} width={vw} height={vh} rx={2} fill="rgba(255,255,255,0.06)" stroke="#1ED760" strokeWidth={1} />
    </svg>
  )
}
