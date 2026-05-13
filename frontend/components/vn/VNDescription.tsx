"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

// ─── VNDB bbcode parser ────────────────────────────────────────────────────────
type Node =
  | { type: "text"; value: string }
  | { type: "br" }
  | { type: "paragraph"; children: Node[] }
  | { type: "bold"; children: Node[] }
  | { type: "italic"; children: Node[] }
  | { type: "strike"; children: Node[] }
  | { type: "spoiler"; children: Node[] }
  | { type: "link"; href: string; children: Node[] }

function parseVNDBMarkup(raw: string): Node[][] {
  // Split into paragraphs by double newline
  const paragraphs = raw.split(/\n\n+/)
  return paragraphs.map(para => parseInline(para))
}

function parseInline(text: string): Node[] {
  const nodes: Node[] = []
  let i = 0

  while (i < text.length) {
    // Single newline → br
    if (text[i] === "\n") {
      nodes.push({ type: "br" })
      i++
      continue
    }

    // Try to match a tag at position i
    const tagMatch = text.slice(i).match(
      /^\[(url=([^\]]+)|i|b|s|spoiler|raw)(?:\])([\s\S]*?)\[\/(?:url|i|b|s|spoiler|raw)\]/
    )
    if (tagMatch) {
      const full = tagMatch[0]
      const tagName = tagMatch[1]
      const urlHref = tagMatch[2]
      const inner = tagMatch[3]

      if (urlHref) {
        nodes.push({ type: "link", href: urlHref, children: parseInline(inner) })
      } else if (tagName === "i") {
        nodes.push({ type: "italic", children: parseInline(inner) })
      } else if (tagName === "b") {
        nodes.push({ type: "bold", children: parseInline(inner) })
      } else if (tagName === "s") {
        nodes.push({ type: "strike", children: parseInline(inner) })
      } else if (tagName === "spoiler") {
        nodes.push({ type: "spoiler", children: parseInline(inner) })
      } else if (tagName === "raw") {
        nodes.push({ type: "text", value: inner })
      }
      i += full.length
      continue
    }

    // Plain text: consume until next special char
    const next = text.slice(i).search(/\n|\[/)
    // If next===0 we're stuck at a '[' that didn't match any tag — treat it as a
    // literal character and advance by 1, otherwise we'd loop forever.
    const end = (next === 0) ? i + 1 : (next === -1) ? text.length : i + next
    nodes.push({ type: "text", value: text.slice(i, end) })
    i = end
  }

  return nodes
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
function RenderNode({
  node, showSpoilers,
}: {
  node: Node
  showSpoilers: boolean
}) {
  switch (node.type) {
    case "text":
      return <>{node.value}</>
    case "br":
      return <br />
    case "bold":
      return <strong><RenderNodes nodes={node.children} showSpoilers={showSpoilers} /></strong>
    case "italic":
      return <em><RenderNodes nodes={node.children} showSpoilers={showSpoilers} /></em>
    case "strike":
      return <s><RenderNodes nodes={node.children} showSpoilers={showSpoilers} /></s>
    case "link":
      return (
        <a href={node.href} target="_blank" rel="noopener noreferrer"
          className="text-accent hover:underline">
          <RenderNodes nodes={node.children} showSpoilers={showSpoilers} />
        </a>
      )
    case "spoiler":
      return showSpoilers ? (
        <span className="bg-white/10 px-0.5 rounded">
          <RenderNodes nodes={node.children} showSpoilers={showSpoilers} />
        </span>
      ) : (
        <span className="bg-white/20 text-transparent select-none rounded px-0.5">
          <RenderNodes nodes={node.children} showSpoilers={showSpoilers} />
        </span>
      )
    default:
      return null
  }
}

function RenderNodes({ nodes, showSpoilers }: { nodes: Node[]; showSpoilers: boolean }) {
  return <>{nodes.map((n, i) => <RenderNode key={i} node={n} showSpoilers={showSpoilers} />)}</>
}

// ─── Component ────────────────────────────────────────────────────────────────
interface VNDescriptionProps {
  text: string
}

export function VNDescription({ text }: VNDescriptionProps) {
  const [showSpoilers, setShowSpoilers] = useState(false)
  if (!text) return null
  const hasSpoilers = text.includes("[spoiler]")
  const paragraphs = parseVNDBMarkup(text)

  return (
    <div>
      <div className="text-sm text-white/85 leading-relaxed space-y-3">
        {paragraphs.map((nodes, i) => (
          <p key={i}>
            <RenderNodes nodes={nodes} showSpoilers={showSpoilers} />
          </p>
        ))}
      </div>
      {hasSpoilers && (
        <button
          onClick={() => setShowSpoilers(s => !s)}
          className="mt-2 text-xs text-muted hover:text-white transition-colors"
        >
          {showSpoilers ? "Hide spoilers" : "Show spoilers"}
        </button>
      )}
    </div>
  )
}
