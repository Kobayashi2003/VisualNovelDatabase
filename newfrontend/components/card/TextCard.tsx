import Link from "next/link"
import { cn } from "@/lib/utils"

interface TextCardProps {
  title: string
  msgs?: string[]
  link?: string
  layout?: "single" | "grid"
  className?: string
}

export function TextCard({ title, msgs, link, layout = "grid", className }: TextCardProps) {
  const card = (
    <div className={cn(
      "bg-surface hover:bg-elevated",
      "rounded-lg border border-white/5",
      "transition-all duration-200",
      layout === "grid" ? "p-3" : "p-3 flex flex-row gap-4 items-center",
      link ? "cursor-pointer hover:border-white/20" : "cursor-default",
      className
    )}>
      <p className={cn("font-semibold text-sm text-white", layout === "grid" ? "truncate" : "flex-1 truncate")}>{title}</p>
      {msgs && (
        <div className={cn(layout === "grid" ? "mt-1" : "flex flex-row gap-2")}>
          {msgs.map((msg, i) => (
            <p key={i} className="text-xs text-muted truncate">{msg}</p>
          ))}
        </div>
      )}
    </div>
  )

  return link ? <Link href={link}>{card}</Link> : card
}
