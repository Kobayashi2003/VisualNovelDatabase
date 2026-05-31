/** Client-only React Flow view of a VN relation graph.
 *
 *  ELK lays out a layered DAG (sequel chains read top→bottom) and routes every
 *  edge orthogonally around the cards; a custom edge renders that routing so
 *  links bend only where needed and chips sit on the line. The user toggles
 *  (covers, labels, direct-only, relation filters) all fold into one layout
 *  pass, and every overlay control lives in a single draggable panel.
 */
"use client"

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { useRouter } from "next/navigation"
import { Crosshair, Maximize2, Plus, Minus, GripVertical, Waypoints, Tag, RefreshCw, Asterisk, ChevronUp, Settings2, Image as ImageIcon, ImageOff, Route, CalendarArrowDown } from "lucide-react"
import {
  ReactFlow, Background, BackgroundVariant, Panel,
  Handle, Position, MarkerType, BaseEdge, EdgeLabelRenderer,
  useReactFlow, useNodesState, useEdgesState, useStore,
  type Node, type Edge, type NodeProps, type EdgeProps,
  type NodeMouseHandler,
  type CoordinateExtent, type ReactFlowInstance,
} from "@xyflow/react"
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js"
import "@xyflow/react/dist/style.css"

import { cn } from "@/lib/utils"
import { displayTitle } from "@/lib/original"
import { enumMap } from "@/lib/enums"
import { useSearchContext } from "@/context/SearchContext"
import { ImageWithFallback } from "@/components/common/ImageWithFallback"
import type { RelationGraph, RelationGraphNode } from "@/lib/types"


/* ─── Constants ────────────────────────────────────────────────────────────── */

// Node footprint; ELK and the rendered card must agree on the size.
const NODE = {
  covers:   { w: 236, h: 86 },
  noCovers: { w: 196, h: 56 },
}
const PAN_MARGIN = 400                      // how far past the graph panning is allowed
const OV_W = 230, OV_H = 120, OV_PAD = 8    // overview (minimap) box

// Per-relation styling. Directed chains (sequel/side/fandisc) are solid + arrowed;
// symmetric links (series/chars/alt/setting) are dashed with no arrow.
const RELATION_STYLE: Record<string, { color: string; dashed: boolean }> = {
  seq:  { color: "#1DB954", dashed: false },  // sequel — Spotify green
  side: { color: "#3B82F6", dashed: false },  // side story — blue
  fan:  { color: "#F59E0B", dashed: false },  // fandisc — amber
  alt:  { color: "#A78BFA", dashed: true },   // alternative version — violet
  set:  { color: "#9CA3AF", dashed: true },   // same setting — gray
  char: { color: "#EC4899", dashed: true },   // shares characters — pink
  ser:  { color: "#14B8A6", dashed: true },   // same series — teal
}
const DEFAULT_STYLE = { color: "#9CA3AF", dashed: true }

// Devstatus dot (VNDB vn.devstatus: 0 finished / 1 in dev / 2 cancelled).
const DEVSTATUS_DOT: Record<number, string> = {
  0: "bg-green-400", 1: "bg-yellow-400", 2: "bg-red-400",
}

// Panel control styles, shared by the toolbar buttons and toggle pills.
const ICON_BTN = "flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-elevated/60 text-muted transition-colors hover:border-white/30 hover:text-white"
const TOGGLE_PILL = "flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
const TOGGLE_ON = "border-accent/40 bg-accent/20 text-accent"
const TOGGLE_OFF = "border-white/10 bg-elevated/60 text-muted hover:text-white"


/* ─── Types ────────────────────────────────────────────────────────────────── */

type XYPoint = { x: number; y: number }
type Box = { x: number; y: number; w: number; h: number }
type VNNodeData = { node: RelationGraphNode; isRoot: boolean; showCovers: boolean; dim?: boolean; pulse?: number; pick?: boolean }
type VNFlowNode = Node<VNNodeData, "vn">
type RelationEdgeData = { points: XYPoint[]; labelX: number; labelY: number; labelHidden: boolean; relation: string }
type RelationFlowEdge = Edge<RelationEdgeData>

// What's currently focused. All three forms collapse to a set of edges + nodes
// (see `focusSets`) so they share one dim/highlight pass:
//   edge     — one clicked link and its two endpoints
//   relation — every link of the same relation type (a second tap on that link)
//   path     — every link/node on a simple path between two chosen titles
type FocusState =
  | { type: "edge"; edgeId: string }
  | { type: "relation"; relation: string; originEdgeId: string }
  | { type: "path"; a: string; b: string }


/* ─── Edge geometry ────────────────────────────────────────────────────────── */

// Drop near-collinear waypoints so straight runs render dead straight (routing
// emits tiny jogs that would otherwise show as kinks).
function simplifyPoints(pts: XYPoint[], eps = 1.5): XYPoint[] {
  if (pts.length <= 2) return pts
  const out: XYPoint[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], c = pts[i + 1]
    const dx = c.x - a.x, dy = c.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const dist = Math.abs((b.x - a.x) * dy - (b.y - a.y) * dx) / len
    if (dist > eps) out.push(b)
  }
  out.push(pts[pts.length - 1])
  return out
}

// Straight segments with a rounded corner only at genuine direction changes —
// no overshoot or spurious S-curves. Expects already-simplified points so the
// label, computed from the same points, lands exactly on the rendered line.
function roundedPath(pts: XYPoint[], radius = 16): string {
  if (pts.length === 0) return ""
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")

  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], cur = pts[i], next = pts[i + 1]
    const v1x = cur.x - prev.x, v1y = cur.y - prev.y
    const v2x = next.x - cur.x, v2y = next.y - cur.y
    const l1 = Math.hypot(v1x, v1y) || 1
    const l2 = Math.hypot(v2x, v2y) || 1
    const r = Math.min(radius, l1 / 2, l2 / 2)
    const p1x = cur.x - (v1x / l1) * r, p1y = cur.y - (v1y / l1) * r
    const p2x = cur.x + (v2x / l2) * r, p2y = cur.y + (v2y / l2) * r
    d += ` L${p1x},${p1y} Q${cur.x},${cur.y} ${p2x},${p2y}`
  }
  const last = pts[pts.length - 1]
  return `${d} L${last.x},${last.y}`
}

// Point halfway along the polyline (by length) — keeps the label on the line.
function polylineMidpoint(pts: XYPoint[]): XYPoint {
  if (pts.length === 0) return { x: 0, y: 0 }
  if (pts.length === 1) return pts[0]
  let total = 0
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  let half = total / 2
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (half <= seg) {
      const t = seg === 0 ? 0 : half / seg
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }
    }
    half -= seg
  }
  return pts[pts.length - 1]
}

// Axis-aligned box overlap; used to keep labels off cards and off each other.
const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y


/* ─── Graph transforms ─────────────────────────────────────────────────────── */

// Keep the edges the predicate allows, then prune nodes no longer reachable from
// the root through what remains (the root itself always stays).
function subgraph(graph: RelationGraph, allow: (e: RelationGraph["edges"][number]) => boolean): RelationGraph {
  const visibleEdges = graph.edges.filter(allow)
  const adj = new Map<string, string[]>()
  const link = (a: string, b: string) => { const arr = adj.get(a); if (arr) arr.push(b); else adj.set(a, [b]) }
  for (const e of visibleEdges) { link(e.a, e.b); link(e.b, e.a) }

  const reachable = new Set<string>([graph.root])
  const queue = [graph.root]
  while (queue.length) {
    for (const next of adj.get(queue.shift()!) ?? []) {
      if (!reachable.has(next)) { reachable.add(next); queue.push(next) }
    }
  }

  return {
    ...graph,
    nodes: graph.nodes.filter(n => reachable.has(n.id)),
    edges: visibleEdges.filter(e => reachable.has(e.a) && reachable.has(e.b)),
  }
}

// Keep only the root and its direct neighbours (and edges among them).
function directGraph(graph: RelationGraph): RelationGraph {
  const keep = new Set<string>([graph.root])
  for (const e of graph.edges) {
    if (e.a === graph.root) keep.add(e.b)
    if (e.b === graph.root) keep.add(e.a)
  }
  return {
    ...graph,
    nodes: graph.nodes.filter(n => keep.has(n.id)),
    edges: graph.edges.filter(e => keep.has(e.a) && keep.has(e.b)),
  }
}

// Union of every edge and node lying on some simple (acyclic) path between two
// titles, over the *undirected* relation graph — relations connect titles
// regardless of arrow direction, so we walk both ways. DFS with a visited set
// keeps each path acyclic; the caps bound the worst case (all-simple-paths is
// exponential) while comfortably covering realistic component sizes.
function pathUnion(edges: Edge[], start: string, end: string): { edges: Set<string>; nodes: Set<string> } | null {
  if (start === end) return null
  const adj = new Map<string, { to: string; id: string }[]>()
  const link = (a: string, b: string, id: string) => {
    const arr = adj.get(a); if (arr) arr.push({ to: b, id }); else adj.set(a, [{ to: b, id }])
  }
  for (const e of edges) { link(e.source, e.target, e.id); link(e.target, e.source, e.id) }

  const outEdges = new Set<string>(), outNodes = new Set<string>()
  const visited = new Set<string>([start])
  const trail: string[] = []
  let paths = 0
  const MAX_PATHS = 20000, MAX_DEPTH = 40

  const dfs = (node: string): void => {
    if (node === end) {
      paths++
      for (const id of trail) outEdges.add(id)
      for (const n of visited) outNodes.add(n)
      return
    }
    if (trail.length >= MAX_DEPTH) return
    for (const { to, id } of adj.get(node) ?? []) {
      if (paths >= MAX_PATHS) return
      if (visited.has(to)) continue
      visited.add(to); trail.push(id)
      dfs(to)
      trail.pop(); visited.delete(to)
    }
  }
  dfs(start)

  return outEdges.size ? { edges: outEdges, nodes: outNodes } : null
}

// Year prefix of a VNDB release date ("2009-05-29" | "2009" | "TBA" | "" | undefined).
function parseYear(released?: string): number | null {
  const m = released?.match(/^\d{4}/)
  return m ? Number(m[0]) : null
}

// Assign every node a layer partition for the chronological layout. Dated nodes
// use their release year; undated nodes inherit the nearest dated node's year via
// a multi-source breadth-first sweep (smallest year first, so they settle beside
// their relations); any node with no dated node anywhere in its component falls
// into a trailing "unknown" band. Returns node-id → dense partition index
// (0 = earliest year = top, with DOWN direction).
function yearPartitions(graph: RelationGraph): Map<string, number> {
  const year = new Map<string, number>()
  for (const n of graph.nodes) {
    const y = parseYear(n.released)
    if (y !== null) year.set(n.id, y)
  }

  const adj = new Map<string, string[]>()
  const link = (a: string, b: string) => { const arr = adj.get(a); if (arr) arr.push(b); else adj.set(a, [b]) }
  for (const e of graph.edges) { link(e.a, e.b); link(e.b, e.a) }

  // Sorted dated nodes seed the sweep; the queue grows as undated nodes inherit a
  // year, and the `has` guard means the first (nearest, earliest) source wins.
  const queue = [...year.keys()].sort((a, b) => year.get(a)! - year.get(b)!)
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]
    for (const nb of adj.get(cur) ?? []) {
      if (!year.has(nb)) { year.set(nb, year.get(cur)!); queue.push(nb) }
    }
  }

  const sorted = [...new Set(year.values())].sort((a, b) => a - b)
  const index = new Map(sorted.map((y, i) => [y, i]))
  const trailing = sorted.length   // unreachable-from-any-date nodes

  const partition = new Map<string, number>()
  for (const n of graph.nodes) {
    const y = year.get(n.id)
    partition.set(n.id, y !== undefined ? index.get(y)! : trailing)
  }
  return partition
}

// ELK lays out the layered DAG AND routes the edges orthogonally around the
// cards, keeping clearance between edges and nodes — that is what removes the
// spurious bends, card crossings and near-overlapping lines we saw before.
const elk = new ELK()
const ELK_OPTIONS: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.spacing.nodeNodeBetweenLayers": "110",
  "elk.spacing.nodeNode": "70",
  "elk.spacing.edgeNode": "30",
  "elk.spacing.edgeEdge": "22",
  "elk.layered.spacing.edgeNodeBetweenLayers": "30",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "16",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
}

async function layoutGraph(graph: RelationGraph, showCovers: boolean, byYear: boolean): Promise<{ nodes: VNFlowNode[]; edges: Edge[] }> {
  const size = showCovers ? NODE.covers : NODE.noCovers
  const RELATION = enumMap("RELATION")

  const descriptors = graph.edges.map((e, i) => ({
    e, id: `${e.a}-${e.b}-${e.relation}-${i}`, text: RELATION[e.relation] ?? e.relation,
  }))

  // Chronological mode pins each node to a year-derived partition; ELK still does
  // crossing reduction and orthogonal routing within and between those bands.
  const partitions = byYear ? yearPartitions(graph) : null

  const laid: ElkNode = await elk.layout({
    id: "root",
    layoutOptions: partitions ? { ...ELK_OPTIONS, "elk.partitioning.activate": "true" } : ELK_OPTIONS,
    children: graph.nodes.map(n => ({
      id: n.id, width: size.w, height: size.h,
      ...(partitions ? { layoutOptions: { "elk.partitioning.partition": String(partitions.get(n.id) ?? 0) } } : {}),
    })),
    edges: descriptors.map(({ e, id }) => ({ id, sources: [e.a], targets: [e.b] })),
  })

  // ELK gives node top-left positions and edge routes in the same coordinate
  // frame, so node positions and edge points line up with no conversion.
  const posById = new Map<string, XYPoint>()
  for (const c of laid.children ?? []) posById.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 })

  const polyById = new Map<string, XYPoint[]>()
  for (const le of laid.edges ?? []) {
    const sec = le.sections?.[0]
    polyById.set(le.id, sec ? [sec.startPoint, ...(sec.bendPoints ?? []), sec.endPoint] : [])
  }

  const nodes: VNFlowNode[] = graph.nodes.map(n => {
    const p = posById.get(n.id) ?? { x: 0, y: 0 }
    return {
      id: n.id,
      type: "vn",
      position: { x: p.x, y: p.y },
      // Explicit dims so the overview and edge geometry have sizes immediately.
      width: size.w,
      height: size.h,
      data: { node: n, isRoot: n.id === graph.root, showCovers },
    }
  })

  const edges: Edge[] = descriptors.map(({ e, id, text }) => {
    const style = RELATION_STYLE[e.relation] ?? DEFAULT_STYLE
    // Simplify once so the label's midpoint and the rendered line share the
    // exact same geometry — that keeps the chip on the line.
    const points = simplifyPoints(polyById.get(id) ?? [])
    const mid = polylineMidpoint(points)
    return {
      id,
      source: e.a,
      target: e.b,
      type: "relation",
      label: text,
      markerEnd: e.directed
        ? { type: MarkerType.ArrowClosed, color: style.color, width: 16, height: 16 }
        : undefined,
      style: {
        stroke: style.color,
        strokeWidth: 1.5,
        strokeDasharray: style.dashed ? "5 4" : undefined,
        opacity: e.official ? 0.9 : 0.4,
      },
      data: { points, labelX: mid.x, labelY: mid.y, labelHidden: false, relation: e.relation } as RelationEdgeData,
    }
  })

  // Hide any label that would land on a card or on an already-placed label, so
  // visible chips never overlap each other or the nodes (lines may pass through
  // them). Greedy in edge order; n ≤ a couple hundred, so O(n²) is fine.
  const boxes: Box[] = nodes.map(n => ({ x: n.position.x, y: n.position.y, w: size.w, h: size.h }))
  for (const edge of edges) {
    const d = edge.data as RelationEdgeData
    const w = Math.min((edge.label as string).length * 5.5 + 8, 130)
    const box: Box = { x: d.labelX - w / 2, y: d.labelY - 7, w, h: 14 }
    if (boxes.some(b => intersects(box, b))) d.labelHidden = true
    else boxes.push(box)
  }

  return { nodes, edges }
}

// Padded bounding box of the laid-out nodes — fences panning.
function panExtent(nodes: VNFlowNode[], showCovers: boolean): CoordinateExtent | undefined {
  if (nodes.length === 0) return undefined
  const size = showCovers ? NODE.covers : NODE.noCovers
  const xs = nodes.map(n => n.position.x)
  const ys = nodes.map(n => n.position.y)
  return [
    [Math.min(...xs) - PAN_MARGIN, Math.min(...ys) - PAN_MARGIN],
    [Math.max(...xs) + size.w + PAN_MARGIN, Math.max(...ys) + size.h + PAN_MARGIN],
  ]
}


/* ─── Node ─────────────────────────────────────────────────────────────────── */

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
        "bg-gradient-to-br from-elevated/95 to-surface/95 shadow-lg shadow-black/30",
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

const nodeTypes = { vn: VNGraphNode }


/* ─── Edge ─────────────────────────────────────────────────────────────────── */

// Lets a custom edge toggle focus on itself (edges aren't React children of the
// view, so this bridges across the ReactFlow boundary).
const EdgeSelectContext = createContext<((id: string) => void) | null>(null)

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

const edgeTypes = { relation: RelationEdge }


/* ─── Overview (self-contained minimap) ────────────────────────────────────── */
// Built from the nodes we already control, so it always renders — the stock
// React Flow MiniMap only draws measured nodes and kept coming up blank.

function Overview({ nodes, rootId }: { nodes: VNFlowNode[]; rootId: string }) {
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


/* ─── Panel (controls + overview + relation filter, draggable) ─────────────── */

function GraphPanel({
  rootId, nodes, relations, hiddenRelations, onToggleRelation,
  showCovers, onToggleCovers, directOnly, onToggleDirect,
  showLabels, onToggleLabels, showUnofficial, onToggleUnofficial,
  chronological, onToggleChronological,
  pathMode, onTogglePath, pathHint, pathMsg,
  onLocate, onRefresh,
}: {
  rootId: string
  nodes: VNFlowNode[]
  relations: string[]
  hiddenRelations: Set<string>
  onToggleRelation: (rel: string) => void
  showCovers: boolean
  onToggleCovers: () => void
  directOnly: boolean
  onToggleDirect: () => void
  chronological: boolean
  onToggleChronological: () => void
  showLabels: boolean
  onToggleLabels: () => void
  showUnofficial: boolean
  onToggleUnofficial: () => void
  pathMode: boolean
  onTogglePath: () => void
  pathHint: string | null
  pathMsg: string | null
  onLocate: () => void
  onRefresh: () => void
}) {
  const { fitView, zoomIn, zoomOut, setCenter, getZoom, getNode } = useReactFlow<VNFlowNode>()
  const RELATION = enumMap("RELATION")

  // Collapsed state shrinks the panel to a single button; the drag offset is
  // shared so it reopens where it was minimised.
  const [collapsed, setCollapsed] = useState(false)

  // Drag-to-move the panel itself, via the grip handle (works in both states).
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null)
  const onGripDown = (e: ReactPointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y, moved: false }
  }
  const onGripMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 3) d.moved = true
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) })
  }
  const onGripUp = (e: ReactPointerEvent) => {
    drag.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // Centre the root card while keeping the current zoom level.
  const locate = useCallback(() => {
    const node = getNode(rootId)
    if (node) {
      const size = showCovers ? NODE.covers : NODE.noCovers
      const w = node.measured?.width ?? size.w
      const h = node.measured?.height ?? size.h
      setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: getZoom(), duration: 600 })
    }
    onLocate()
  }, [getNode, setCenter, getZoom, rootId, showCovers, onLocate])

  // Collapsed: a single draggable button. A plain click (no drag) reopens it.
  if (collapsed) {
    return (
      <button
        title="Show panel"
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={e => { const moved = drag.current?.moved; onGripUp(e); if (!moved) setCollapsed(false) }}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full border border-white/10 bg-surface/80 text-muted shadow-2xl backdrop-blur-xl transition-colors hover:text-white active:cursor-grabbing"
      >
        <Settings2 className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className="flex w-64 flex-col gap-2.5 rounded-2xl border border-white/10 bg-surface/80 p-2.5 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center gap-1.5">
        <button title="Move panel" onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp} className={cn(ICON_BTN, "cursor-grab active:cursor-grabbing")}>
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button className={ICON_BTN} title="Locate this VN" onClick={locate}><Crosshair className="h-3.5 w-3.5" /></button>
        <button className={ICON_BTN} title="Fit to view" onClick={() => fitView({ duration: 500, padding: 0.25 })}><Maximize2 className="h-3.5 w-3.5" /></button>
        <button className={ICON_BTN} title="Zoom out" onClick={() => zoomOut({ duration: 200 })}><Minus className="h-3.5 w-3.5" /></button>
        <button className={ICON_BTN} title="Zoom in" onClick={() => zoomIn({ duration: 200 })}><Plus className="h-3.5 w-3.5" /></button>
        <button className={ICON_BTN} title="Refresh graph" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /></button>
        <button className={cn(ICON_BTN, "ml-auto")} title="Hide panel" onClick={() => setCollapsed(true)}><ChevronUp className="h-3.5 w-3.5" /></button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={onToggleDirect} title="Show only this VN's direct relations" className={cn(TOGGLE_PILL, directOnly ? TOGGLE_ON : TOGGLE_OFF)}>
          <Waypoints className="h-3.5 w-3.5" />
          Direct
        </button>
        <button onClick={onToggleUnofficial} title="Show unofficial relations" className={cn(TOGGLE_PILL, showUnofficial ? TOGGLE_ON : TOGGLE_OFF)}>
          <Asterisk className="h-3.5 w-3.5" />
          Unofficial
        </button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={onToggleCovers} title="Toggle cover art" className={cn(TOGGLE_PILL, showCovers ? TOGGLE_ON : TOGGLE_OFF)}>
          {showCovers ? <ImageIcon className="h-3.5 w-3.5" /> : <ImageOff className="h-3.5 w-3.5" />}
          Covers
        </button>
        <button onClick={onToggleLabels} title="Toggle relation labels" className={cn(TOGGLE_PILL, showLabels ? TOGGLE_ON : TOGGLE_OFF)}>
          <Tag className="h-3.5 w-3.5" />
          Labels
        </button>
      </div>

      <div className="flex">
        <button onClick={onToggleChronological} title="Lay out titles in release-year order (earliest at top)" className={cn(TOGGLE_PILL, chronological ? TOGGLE_ON : TOGGLE_OFF)}>
          <CalendarArrowDown className="h-3.5 w-3.5" />
          Year layers
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <button onClick={onTogglePath} title="Trace every path between two titles" className={cn(TOGGLE_PILL, pathMode ? TOGGLE_ON : TOGGLE_OFF)}>
          <Route className="h-3.5 w-3.5" />
          Path finder
        </button>
        {pathHint && <p className="px-1 text-[10px] leading-snug text-sky-300/90">{pathHint}</p>}
        {pathMsg && <p className="px-1 text-[10px] leading-snug text-yellow-400/90">{pathMsg}</p>}
      </div>

      <Overview nodes={nodes} rootId={rootId} />

      {relations.length > 0 && (
        <div className="text-[11px]">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted">Filter relations</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {relations.map(rel => {
              const style = RELATION_STYLE[rel] ?? DEFAULT_STYLE
              const hidden = hiddenRelations.has(rel)
              return (
                <button
                  key={rel}
                  onClick={() => onToggleRelation(rel)}
                  title={hidden ? "Show this relation" : "Hide this relation"}
                  className="flex items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-white/5"
                >
                  <span
                    className="h-0 w-4 shrink-0"
                    style={{ borderTopWidth: 2, borderTopStyle: style.dashed ? "dashed" : "solid", borderColor: style.color, opacity: hidden ? 0.3 : 1 }}
                  />
                  <span className={cn("truncate", hidden ? "text-muted/40 line-through" : "text-white/80")}>{RELATION[rel] ?? rel}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


/* ─── View ─────────────────────────────────────────────────────────────────── */

export function RelationGraphView({ graph, onRefresh }: { graph: RelationGraph; onRefresh: () => void }) {
  const router = useRouter()

  // Display options. Covers persist; the legend lists every relation type from
  // the original graph so a hidden one can always be switched back on.
  const [showCovers, setShowCovers] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("rgShowCovers") === "true",
  )
  useEffect(() => { localStorage.setItem("rgShowCovers", String(showCovers)) }, [showCovers])

  // Chronological layering — off by default; persisted like covers.
  const [chronological, setChronological] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("rgChronological") === "true",
  )
  useEffect(() => { localStorage.setItem("rgChronological", String(chronological)) }, [chronological])

  const [hiddenRelations, setHiddenRelations] = useState<Set<string>>(new Set())
  const [directOnly, setDirectOnly] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showUnofficial, setShowUnofficial] = useState(false)

  const allRelations = useMemo(() => [...new Set(graph.edges.map(e => e.relation))], [graph])
  const toggleRelation = useCallback((rel: string) => {
    setHiddenRelations(prev => {
      const next = new Set(prev)
      if (next.has(rel)) next.delete(rel)
      else next.add(rel)
      return next
    })
  }, [])

  // graph → edge filter (hidden types + official-only) → direct → ELK layout.
  // Everything downstream derives from `initial`, the single laid-out source.
  const filteredGraph = useMemo(() => {
    const g = subgraph(graph, e => !hiddenRelations.has(e.relation) && (showUnofficial || e.official))
    return directOnly ? directGraph(g) : g
  }, [graph, hiddenRelations, showUnofficial, directOnly])
  // ELK layout is async; keep the previous result until the new one resolves so
  // toggles don't flash an empty canvas.
  const [initial, setInitial] = useState<{ nodes: VNFlowNode[]; edges: Edge[] }>({ nodes: [], edges: [] })
  useEffect(() => {
    let cancelled = false
    layoutGraph(filteredGraph, showCovers, chronological).then(result => { if (!cancelled) setInitial(result) })
    return () => { cancelled = true }
  }, [filteredGraph, showCovers, chronological])
  const translateExtent = useMemo(() => panExtent(initial.nodes, showCovers), [initial, showCovers])

  // Transient presentation state, folded into the rendered nodes/edges below.
  const [focus, setFocus] = useState<FocusState | null>(null)
  const [pulse, setPulse] = useState<{ id: string; stamp: number } | null>(null)

  // Path-finder mode: pick two titles to trace the links between them.
  const [pathMode, setPathMode] = useState(false)
  const [pathStart, setPathStart] = useState<string | null>(null)
  const [pathMsg, setPathMsg] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<VNFlowNode>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges)

  // Collapse the active focus into the exact edges and nodes to highlight. Every
  // focus form (one edge, a whole relation, a traced path) reduces to this pair,
  // so the dim/highlight pass below treats them identically. `null` = no focus.
  const focusSets = useMemo<{ edges: Set<string>; nodes: Set<string> } | null>(() => {
    if (!focus) return null
    if (focus.type === "edge") {
      const e = initial.edges.find(x => x.id === focus.edgeId)
      return e ? { edges: new Set([e.id]), nodes: new Set([e.source, e.target]) } : null
    }
    if (focus.type === "relation") {
      const fe = new Set<string>(), fn = new Set<string>()
      for (const e of initial.edges) {
        if ((e.data as RelationEdgeData | undefined)?.relation === focus.relation) {
          fe.add(e.id); fn.add(e.source); fn.add(e.target)
        }
      }
      return fe.size ? { edges: fe, nodes: fn } : null
    }
    return pathUnion(initial.edges, focus.a, focus.b)
  }, [focus, initial.edges])

  // A layout change (filter / direct / covers) can't corrupt the highlight:
  // `focusSets` recomputes from the new edges and yields `null` when the focused
  // edges no longer exist, which simply clears the dimming.

  // The one place presentation is applied: re-derive nodes/edges from `initial`
  // whenever it, the focus, the locate pulse, or the label toggle changes.
  // Focusing dims everything but the focused edges and their endpoints, and
  // hides every other label.
  useEffect(() => {
    setNodes(initial.nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        dim: focusSets ? !focusSets.nodes.has(n.id) : false,
        pick: pathStart === n.id,
        pulse: pulse?.id === n.id ? pulse.stamp : undefined,
      },
    })))

    setEdges(initial.edges.map(e => {
      const selected = focusSets ? focusSets.edges.has(e.id) : false
      const dimmed = !!focusSets && !selected
      // A collision-hidden label still shows when its edge is focused (everything
      // else is dimmed then, so it can't overlap anything).
      const labelHidden = (e.data as RelationEdgeData | undefined)?.labelHidden
      const showLabel = showLabels && !dimmed && (selected || !labelHidden)
      // No zIndex bump on the focused edge: elevating it drew the line above the
      // label layer and covered the chip. Opacity contrast (others dimmed) is
      // enough to make the focus stand out.
      return {
        ...e,
        label: showLabel ? e.label : undefined,
        style: { ...e.style, opacity: dimmed ? 0.05 : selected ? 1 : e.style?.opacity, strokeWidth: selected ? 3 : e.style?.strokeWidth },
      }
    }))
  }, [initial, focusSets, pathStart, pulse, showLabels, setNodes, setEdges])

  // Re-fit when the layout changes (filter / direct / covers) so the viewport
  // stays valid — otherwise the first pan snaps it into the new translateExtent.
  // Deferred two frames so the new nodes are measured first.
  const rfRef = useRef<ReactFlowInstance<VNFlowNode, Edge> | null>(null)
  useEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => rfRef.current?.fitView({ duration: 400, padding: 0.25 })) })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [initial])

  const onLocate = useCallback(() => {
    const stamp = Date.now()
    setPulse({ id: graph.root, stamp })
    window.setTimeout(() => setPulse(p => (p?.stamp === stamp ? null : p)), 1600)
  }, [graph.root])

  // In path mode a node click picks an endpoint (first = start, second = traces
  // the paths and resets for the next pair); otherwise it opens the VN page.
  const onNodeClick = useCallback<NodeMouseHandler<VNFlowNode>>((_, node) => {
    if (!pathMode) { router.push(`/${node.id}`); return }
    if (!pathStart) { setPathStart(node.id); setPathMsg(null); return }
    if (pathStart === node.id) { setPathStart(null); return }  // tap the start again to undo
    setPathStart(null)
    // Resolve eagerly so a "no path" outcome can be reported from the click.
    if (pathUnion(initial.edges, pathStart, node.id)) {
      setFocus({ type: "path", a: pathStart, b: node.id }); setPathMsg(null)
    } else {
      setPathMsg("No path between those two titles.")
    }
  }, [pathMode, pathStart, router, initial.edges])

  // Edge focus is toggled from inside the edge (via context), so a drag there can
  // pan instead; the pane still clears focus on a plain click. Tapping a link
  // cycles focus: nothing → that link → every link of its relation → nothing.
  const selectEdge = useCallback((edgeId: string) => {
    setFocus(cur => {
      if (cur?.type === "edge" && cur.edgeId === edgeId) {
        const rel = (initial.edges.find(e => e.id === edgeId)?.data as RelationEdgeData | undefined)?.relation
        return rel ? { type: "relation", relation: rel, originEdgeId: edgeId } : null
      }
      if (cur?.type === "relation" && cur.originEdgeId === edgeId) return null
      return { type: "edge", edgeId }
    })
  }, [initial.edges])

  // Toggle path mode; entering or leaving it drops any in-progress pick and any
  // path highlight (a single-edge / relation focus is left untouched).
  const togglePath = useCallback(() => {
    setPathMode(v => !v)
    setPathStart(null)
    setFocus(cur => (cur?.type === "path" ? null : cur))
    setPathMsg(null)
  }, [])

  const pathHint = pathMode ? (pathStart ? "Now click the destination title." : "Click the start title.") : null

  return (
    <EdgeSelectContext.Provider value={selectEdge}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onInit={inst => { rfRef.current = inst }}
      onNodeClick={onNodeClick}
      onPaneClick={() => { setFocus(null); setPathStart(null); setPathMsg(null) }}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      translateExtent={translateExtent}
      minZoom={0.15}
      maxZoom={1.6}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} color="#2a2a2a" gap={22} size={1.5} />

      {/* Pushed below the page header overlay. */}
      <Panel position="top-right" style={{ marginTop: 76 }}>
        <GraphPanel
          rootId={graph.root}
          nodes={initial.nodes}
          relations={allRelations}
          hiddenRelations={hiddenRelations}
          onToggleRelation={toggleRelation}
          showCovers={showCovers}
          onToggleCovers={() => setShowCovers(v => !v)}
          directOnly={directOnly}
          onToggleDirect={() => setDirectOnly(v => !v)}
          chronological={chronological}
          onToggleChronological={() => setChronological(v => !v)}
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels(v => !v)}
          showUnofficial={showUnofficial}
          onToggleUnofficial={() => setShowUnofficial(v => !v)}
          pathMode={pathMode}
          onTogglePath={togglePath}
          pathHint={pathHint}
          pathMsg={pathMsg}
          onLocate={onLocate}
          onRefresh={onRefresh}
        />
      </Panel>
    </ReactFlow>
    </EdgeSelectContext.Provider>
  )
}
