/** Layout primitives for detail-page info panels: label row, inline list, section heading. */

import { ChevronRight } from "lucide-react"

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-xs text-white/90 flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

/** Renders a list of values inline, joined by a separator that is dimmer than
 *  the values themselves — the standard way to show a multi-value field in an
 *  info panel (no background boxes). */
export function InlineList({
  items, separator = ", ", className,
}: {
  items: React.ReactNode[]
  separator?: string
  className?: string
}) {
  return (
    <span className={className}>
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="text-white/30">{separator}</span>}
          {item}
        </span>
      ))}
    </span>
  )
}

export function Section({ title, count, action, onTitleClick, children }: {
  title: string
  count?: number
  action?: React.ReactNode
  /** When set, the heading itself becomes a button (with a chevron) — e.g. the
   *  VN page's Characters section opening the expanded card view. */
  onTitleClick?: () => void
  children: React.ReactNode
}) {
  const titleBlock = (
    <>
      <span className="text-sm font-bold text-white uppercase tracking-wider transition-colors group-hover:text-accent">{title}</span>
      {count !== undefined && <span className="text-xs font-normal text-muted">{count}</span>}
      {onTitleClick && (
        <ChevronRight className="w-4 h-4 text-muted transition-colors group-hover:text-accent" aria-hidden />
      )}
    </>
  )

  return (
    <div>
      {/* A short accent tick anchors the heading and lifts it off the body text
       *  without the heavy feel of a full divider — keeps the Spotify accent motif. */}
      <h2 className="flex items-center gap-2.5 mb-3">
        <span className="w-1 h-4 rounded-full bg-accent shrink-0" aria-hidden />
        {onTitleClick ? (
          <button type="button" onClick={onTitleClick} className="group flex items-center gap-2.5 cursor-pointer">
            {titleBlock}
          </button>
        ) : titleBlock}
        {action && <span className="ml-auto">{action}</span>}
      </h2>
      {children}
    </div>
  )
}
