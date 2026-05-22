/** Full-panel error state with an icon and message. */

import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

interface ErrorPanelProps {
  message?: string
  className?: string
}

export function ErrorPanel({ message = "An error occurred", className }: ErrorPanelProps) {
  return (
    <div className={cn("flex flex-col justify-center items-center gap-4", className)}>
      <div className="p-4 bg-red-500/10 rounded-full">
        <AlertCircle className="w-12 h-12 text-red-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">Error</h3>
        <p className="text-sm font-medium text-muted">{message}</p>
      </div>
    </div>
  )
}
