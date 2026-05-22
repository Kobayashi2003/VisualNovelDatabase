/** Asc/desc sort-order toggle button. */

import { ArrowUp, ArrowDown } from "lucide-react"
import { IconButton } from "@/components/button/IconButton"

interface OrderSwitchProps {
  order: string
  setOrder: () => void
  disabled?: boolean
  className?: string
}

export function OrderSwitch({ order, setOrder, disabled, className }: OrderSwitchProps) {
  return (
    <IconButton
      icon={order === "desc" ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
      onClick={setOrder}
      disabled={disabled}
      tooltip={order === "desc" ? "Descending" : "Ascending"}
      className={className}
    />
  )
}
