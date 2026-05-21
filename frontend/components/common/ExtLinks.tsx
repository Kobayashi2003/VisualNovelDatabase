/** Unified "Links" panel for detail-page info sidebars (VN / Producer /
 *  Release / Staff). Links render as plain text + an external-link glyph —
 *  no background box — with hover-accent signalling that they're clickable. */

import { ExternalLink } from "lucide-react"

interface ExtLink {
  url: string
  label: string
}

export function ExtLinks({ links }: { links: ExtLink[] }) {
  if (links.length === 0) return null

  return (
    <div className="rounded-lg bg-surface border border-white/5 px-3 py-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Links</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {links.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/70 hover:text-accent transition-colors"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}
