/** Toggle between grid and single-column list layouts. */

import { SwitchButton } from "@/components/button/SwitchButton"
import { LayoutGrid, Rows } from "lucide-react"

interface GridLayoutSwitchProps {
  layout: "single" | "grid"
  setLayout: (layout: "single" | "grid") => void
  disabled?: boolean
  className?: string
}

export function GridLayoutSwitch({ layout, setLayout, disabled, className }: GridLayoutSwitchProps) {
  const options = [
    { value: "grid", icon: <LayoutGrid className="w-4 h-4" />, tooltip: "Grid layout" },
    { value: "single", icon: <Rows className="w-4 h-4" />, tooltip: "List layout" },
  ]

  return (
    <SwitchButton
      options={options}
      selected={layout}
      onSelect={(v) => setLayout(v as "single" | "grid")}
      disabled={disabled}
      className={className}
    />
  )
}
