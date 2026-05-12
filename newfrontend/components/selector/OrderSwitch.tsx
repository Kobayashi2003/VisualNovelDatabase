import { cn } from "@/lib/utils"
import { SwitchButton } from "@/components/button/SwitchButton"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface OrderSwitchProps {
  order: string
  setOrder: () => void
  disabled?: boolean
  className?: string
}

export function OrderSwitch({ order, setOrder, disabled, className }: OrderSwitchProps) {
  return (
    <button
      onClick={setOrder}
      disabled={disabled}
      className={cn(
        "p-2 rounded-full",
        "text-muted hover:text-white",
        "hover:bg-white/10",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      title={order === "desc" ? "Descending" : "Ascending"}
    >
      {order === "desc"
        ? <ArrowDown className="w-4 h-4" />
        : <ArrowUp className="w-4 h-4" />
      }
    </button>
  )
}
