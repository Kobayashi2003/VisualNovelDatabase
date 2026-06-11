/** Pure layout + geometry for the VN relation graph — no React.
 *
 *  ELK lays out a layered DAG (sequel chains read top→bottom) and routes every
 *  edge orthogonally around the cards; `roundedPath` renders that routing so
 *  links bend only where needed and chips sit on the line. Everything here is a
 *  plain function or constant the view layer consumes, so the geometry and the
 *  graph algorithms can be reasoned about (and tested) without a canvas. */

import { MarkerType, type Node, type Edge, type CoordinateExtent } from "@xyflow/react"
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js"

import { enumMap } from "@/lib/enums"
import type { RelationGraph, RelationGraphNode } from "@/lib/types"


/* ─── Constants ────────────────────────────────────────────────────────────── */

// Node footprint; ELK and the rendered card must agree on the size.
export const NODE = {
  covers:   { w: 236, h: 86 },
  noCovers: { w: 196, h: 56 },
}
const PAN_MARGIN = 400   // how far past the graph panning is allowed

// Per-relation styling. Directed chains (sequel/side/fandisc) are solid + arrowed;
// symmetric links (series/chars/alt/setting) are dashed with no arrow.
export const RELATION_STYLE: Record<string, { color: string; dashed: boolean }> = {
  seq:  { color: "#1DB954", dashed: false },  // sequel — Spotify green
  side: { color: "#3B82F6", dashed: false },  // side story — blue
  fan:  { color: "#F59E0B", dashed: false },  // fandisc — amber
  alt:  { color: "#A78BFA", dashed: true },   // alternative version — violet
  set:  { color: "#9CA3AF", dashed: true },   // same setting — gray
  char: { color: "#EC4899", dashed: true },   // shares characters — pink
  ser:  { color: "#14B8A6", dashed: true },   // same series — teal
}
export const DEFAULT_STYLE = { color: "#9CA3AF", dashed: true }


/* ─── Types ────────────────────────────────────────────────────────────────── */

export type XYPoint = { x: number; y: number }
type Box = { x: number; y: number; w: number; h: number }
export type VNNodeData = { node: RelationGraphNode; isRoot: boolean; showCovers: boolean; dim?: boolean; pulse?: number; pick?: boolean }
export type VNFlowNode = Node<VNNodeData, "vn">
export type RelationEdgeData = { points: XYPoint[]; labelX: number; labelY: number; labelHidden: boolean; relation: string }
export type RelationFlowEdge = Edge<RelationEdgeData>


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
export function roundedPath(pts: XYPoint[], radius = 16): string {
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
export function subgraph(graph: RelationGraph, allow: (e: RelationGraph["edges"][number]) => boolean): RelationGraph {
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
export function directGraph(graph: RelationGraph): RelationGraph {
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
export function pathUnion(edges: Edge[], start: string, end: string): { edges: Set<string>; nodes: Set<string> } | null {
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

export async function layoutGraph(graph: RelationGraph, showCovers: boolean, byYear: boolean): Promise<{ nodes: VNFlowNode[]; edges: Edge[] }> {
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
export function panExtent(nodes: VNFlowNode[], showCovers: boolean): CoordinateExtent | undefined {
  if (nodes.length === 0) return undefined
  const size = showCovers ? NODE.covers : NODE.noCovers
  const xs = nodes.map(n => n.position.x)
  const ys = nodes.map(n => n.position.y)
  return [
    [Math.min(...xs) - PAN_MARGIN, Math.min(...ys) - PAN_MARGIN],
    [Math.max(...xs) + size.w + PAN_MARGIN, Math.max(...ys) + size.h + PAN_MARGIN],
  ]
}
