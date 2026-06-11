/** Full-panel status states — loading / error / empty. All three share one
 *  centred icon-bubble + title + subtitle layout, so they live together over a
 *  single private `StatusPanel` base and differ only by icon, tint and copy. */

import type { ComponentType } from "react"
import { Loader2, AlertCircle, SearchX } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusPanelProps {
  icon: ComponentType<{ className?: string }>
  /** Tailwind classes for the icon bubble + glyph (e.g. "bg-accent/10 text-accent"). */
  tone: string
  title: string
  subtitle: string
  spin?: boolean
  className?: string
}

function StatusPanel({ icon: Icon, tone, title, subtitle, spin, className }: StatusPanelProps) {
  return (
    <div className={cn("flex flex-col justify-center items-center gap-4", className)}>
      <div className={cn("p-4 rounded-full", tone)}>
        <Icon className={cn("w-12 h-12", spin && "animate-spin")} />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm font-medium text-muted">{subtitle}</p>
      </div>
    </div>
  )
}

export function Loading({ message = "Loading...", className }: { message?: string; className?: string }) {
  return <StatusPanel icon={Loader2} tone="bg-accent/10 text-accent" title={message} subtitle="Please wait a moment" spin className={className} />
}

export function ErrorPanel({ message = "An error occurred", className }: { message?: string; className?: string }) {
  return <StatusPanel icon={AlertCircle} tone="bg-red-500/10 text-red-400" title="Error" subtitle={message} className={className} />
}

export function NotFound({ message = "Nothing found", className }: { message?: string; className?: string }) {
  return <StatusPanel icon={SearchX} tone="bg-white/5 text-muted" title="Not Found" subtitle={message} className={className} />
}
