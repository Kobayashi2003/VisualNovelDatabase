import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingProps {
  message?: string
  className?: string
}

export function Loading({ message = "Loading...", className }: LoadingProps) {
  return (
    <div className={cn("flex flex-col justify-center items-center gap-4", className)}>
      <div className="p-4 bg-accent/10 rounded-full">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">{message}</h3>
        <p className="text-sm font-medium text-muted">Please wait a moment</p>
      </div>
    </div>
  )
}
