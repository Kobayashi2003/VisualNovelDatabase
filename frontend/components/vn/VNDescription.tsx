/** Renders VNDB-flavoured BBCode descriptions; spoilers reveal on click. */
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"


/* ─── BBCode parser ────────────────────────────────────────────────────────── */

type Node =
  | { type: "text"; value: string }
  | { type: "br" }
  | { type: "bold"; children: Node[] }
  | { type: "italic"; children: Node[] }
  | { type: "strike"; children: Node[] }
  | { type: "spoiler"; children: Node[] }
  | { type: "link"; href: string; children: Node[] }

function parseVNDBMarkup(raw: string): Node[][] {
  // Split into paragraphs by blank line.
  const paragraphs = raw.split(/\n\n+/)
  return paragraphs.map(para => parseInline(para))
}

/** Index of the `[/tagName]` that closes the tag whose content starts at
 *  `from`, counting nested same-name tags so an inner tag of the same kind
 *  doesn't end the match early. Returns -1 when there is no balanced close. */
function findClosingTag(text: string, from: number, tagName: string): number {
  const opening = tagName === "url" ? "\\[url(?:=[^\\]]+)?\\]" : `\\[${tagName}\\]`
  const re = new RegExp(`${opening}|\\[/${tagName}\\]`, "g")
  re.lastIndex = from
  let depth = 1
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m[0][1] === "/") {
      if (--depth === 0) return m.index
    } else {
      depth++
    }
  }
  return -1
}

function parseInline(text: string): Node[] {
  const nodes: Node[] = []
  let i = 0

  while (i < text.length) {
    // Single newline → <br>
    if (text[i] === "\n") {
      nodes.push({ type: "br" })
      i++
      continue
    }

    // An opening tag at position i?
    const open = text.slice(i).match(/^\[(url=([^\]]+)|i|b|s|spoiler|raw)\]/)
    if (open) {
      const urlHref = open[2]
      const tagName = urlHref ? "url" : open[1]
      const contentStart = i + open[0].length

      // `[raw]` content is literal (not re-parsed); every other tag must skip
      // past nested same-name tags to find its real close — crucially, this
      // stops a nested tag's close (e.g. an inner `[/url]`) from being
      // mistaken for the outer tag's own close.
      const closeIdx = tagName === "raw"
        ? text.indexOf("[/raw]", contentStart)
        : findClosingTag(text, contentStart, tagName)

      if (closeIdx !== -1) {
        const inner = text.slice(contentStart, closeIdx)
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
        i = closeIdx + tagName.length + 3 // advance past "[/tagName]"
        continue
      }
      // No matching close tag — fall through and treat "[" as a literal char.
    }

    // Plain text: consume until the next newline or "[".
    const next = text.slice(i).search(/\n|\[/)
    // next===0 means we're on a "[" that began no valid tag — emit it as a
    // literal and advance by one, otherwise the loop would never progress.
    const end = next === 0 ? i + 1 : next === -1 ? text.length : i + next
    nodes.push({ type: "text", value: text.slice(i, end) })
    i = end
  }

  return nodes
}

/* ─── Renderer ─────────────────────────────────────────────────────────────── */

/** A spoiler region: blacked out until clicked, click again to re-hide. */
function Spoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <span
      title={revealed ? "Click to hide spoiler" : "Click to reveal spoiler"}
      onClick={e => {
        // Keep clicks contained (e.g. nested spoilers don't toggle the parent).
        e.stopPropagation()
        // While revealed, let clicks on inner links navigate instead of hiding.
        if (revealed && (e.target as HTMLElement).closest("a")) return
        setRevealed(r => !r)
      }}
      className={cn(
        "rounded px-0.5 cursor-pointer transition-colors",
        revealed
          ? "bg-white/10"
          : "bg-white/20 text-transparent select-none hover:bg-white/25 [&_a]:text-transparent [&_a]:pointer-events-none",
      )}
    >
      {children}
    </span>
  )
}

function RenderNode({ node }: { node: Node }) {
  switch (node.type) {
    case "text":
      return <>{node.value}</>
    case "br":
      return <br />
    case "bold":
      return <strong><RenderNodes nodes={node.children} /></strong>
    case "italic":
      return <em><RenderNodes nodes={node.children} /></em>
    case "strike":
      return <s><RenderNodes nodes={node.children} /></s>
    case "link":
      return (
        <a href={node.href} target="_blank" rel="noopener noreferrer"
          className="text-accent hover:underline">
          <RenderNodes nodes={node.children} />
        </a>
      )
    case "spoiler":
      return <Spoiler><RenderNodes nodes={node.children} /></Spoiler>
    default:
      return null
  }
}

function RenderNodes({ nodes }: { nodes: Node[] }) {
  return <>{nodes.map((n, i) => <RenderNode key={i} node={n} />)}</>
}

/* ─── Component ────────────────────────────────────────────────────────────── */
interface VNDescriptionProps {
  text: string
}

export function VNDescription({ text }: VNDescriptionProps) {
  if (!text) return null
  const paragraphs = parseVNDBMarkup(text)

  return (
    <div className="text-sm text-white/85 leading-relaxed space-y-3">
      {paragraphs.map((nodes, i) => (
        <p key={i}>
          <RenderNodes nodes={nodes} />
        </p>
      ))}
    </div>
  )
}
