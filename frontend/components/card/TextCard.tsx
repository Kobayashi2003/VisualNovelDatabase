/** Text-only card (no thumbnail), with grid and single-row layouts. */

import Link from "next/link"
import { cn } from "@/lib/utils"

interface TextCardProps {
  title: string
  msgs?: React.ReactNode[]
  link?: string
  layout?: "single" | "grid"
  tooltip?: string
  className?: string
  /** Optional trailing content (e.g. quick-rate stars). */
  footer?: React.ReactNode
}

export function TextCard({ title, msgs, link, layout = "grid", tooltip, className, footer }: TextCardProps) {
  const card = (
    <div className={cn(
      "bg-surface hover:bg-elevated",
      "rounded-lg border border-white/5",
      "transition-all duration-200",
      layout === "grid" ? "p-3" : "p-3 flex gap-4 items-center",
      link ? "cursor-pointer hover:border-white/20" : "cursor-default",
      className
    )} title={tooltip}>
      <p className={cn("font-semibold text-sm text-white", layout === "grid" ? "truncate" : "flex-1 truncate")}>{title}</p>
      <div className={cn(layout === "grid" ? "mt-1 min-h-4" : "flex gap-2")}>
        {msgs?.map((msg, i) => (
          <p key={i} className="text-xs text-muted truncate">{msg}</p>
        ))}
      </div>
      {footer && <div className={layout === "grid" ? "mt-2" : "shrink-0"}>{footer}</div>}
    </div>
  )

  return link ? <Link href={link}>{card}</Link> : card
}
