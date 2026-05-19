/** Shared layout primitives for detail-side info panels (label row + section heading). */

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-xs text-white/90 flex flex-wrap gap-1">{children}</div>
    </div>
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
