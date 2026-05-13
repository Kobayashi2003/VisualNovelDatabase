import { cn } from "@/lib/utils"
import { SearchX } from "lucide-react"

interface NotFoundProps {
  message?: string
  className?: string
}

export function NotFound({ message = "Nothing found", className }: NotFoundProps) {
  return (
    <div className={cn("flex flex-col justify-center items-center gap-4", className)}>
      <div className="p-4 bg-white/5 rounded-full">
        <SearchX className="w-12 h-12 text-muted" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">Not Found</h3>
        <p className="text-sm font-medium text-muted">{message}</p>
      </div>
    </div>
  )
}
