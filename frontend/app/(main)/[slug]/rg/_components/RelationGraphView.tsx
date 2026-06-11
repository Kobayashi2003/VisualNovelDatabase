/** Client-only React Flow view of a VN relation graph.
 *
 *  The layout + geometry live in `../_lib/graph-layout`; the rendered canvas
 *  primitives (node, edge, overview) live in `./GraphElements`. This file owns
 *  the interaction state — the user toggles (covers, labels, direct-only,
 *  relation filters, chronological, path finder) all fold into one layout pass,
 *  and every overlay control lives in a single draggable panel.
 */
"use client"

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { useRouter } from "next/navigation"
import { Crosshair, Maximize2, Plus, Minus, GripVertical, Waypoints, Tag, RefreshCw, Asterisk, ChevronUp, Settings2, Image as ImageIcon, ImageOff, Route, CalendarArrowDown } from "lucide-react"
import {
  ReactFlow, Background, BackgroundVariant, Panel,
  useReactFlow, useNodesState, useEdgesState,
  type Edge, type NodeMouseHandler, type ReactFlowInstance,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { cn } from "@/lib/utils"
import { enumMap } from "@/lib/enums"
import type { RelationGraph } from "@/lib/types"
import {
  subgraph, directGraph, pathUnion, layoutGraph, panExtent,
  RELATION_STYLE, DEFAULT_STYLE, NODE,
  type VNFlowNode, type RelationEdgeData,
} from "../_lib/graph-layout"
import { nodeTypes, edgeTypes, EdgeSelectContext, Overview } from "./GraphElements"


/* ─── Constants ────────────────────────────────────────────────────────────── */

// Panel control styles, shared by the toolbar buttons and toggle pills.
const ICON_BTN = "flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-elevated/60 text-muted transition-colors hover:border-white/30 hover:text-white"
const TOGGLE_PILL = "flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
const TOGGLE_ON = "border-accent/40 bg-accent/20 text-accent"
const TOGGLE_OFF = "border-white/10 bg-elevated/60 text-muted hover:text-white"


/* ─── Types ────────────────────────────────────────────────────────────────── */

// What's currently focused. All three forms collapse to a set of edges + nodes
// (see `focusSets`) so they share one dim/highlight pass:
//   edge     — one clicked link and its two endpoints
//   relation — every link of the same relation type (a second tap on that link)
//   path     — every link/node on a simple path between two chosen titles
type FocusState =
  | { type: "edge"; edgeId: string }
  | { type: "relation"; relation: string; originEdgeId: string }
  | { type: "path"; a: string; b: string }


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
