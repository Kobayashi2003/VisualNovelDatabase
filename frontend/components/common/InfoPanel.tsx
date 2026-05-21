/** Shared layout primitives for detail-side info panels (label row + section heading). */

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

export function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
        {title}
        {count !== undefined && <span className="ml-1.5 text-xs font-normal">{count}</span>}
      </h2>
      {children}
    </div>
  )
}
