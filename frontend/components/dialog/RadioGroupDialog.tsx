/** Dialog presenting a list of mutually-exclusive options; selecting closes it. */

import { cn } from "@/lib/utils"
import { BaseDialog } from "./BaseDialog"

interface Option {
  value: string
  label: string
}

interface RadioGroupDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  options: Option[]
  selected: string
  setSelected: (selected: string) => void
  className?: string
}

export function RadioGroupDialog({ open, setOpen, title, options, selected, setSelected, className }: RadioGroupDialogProps) {
  const handleSelect = (value: string) => {
    setSelected(value)
    setOpen(false)
  }

  return (
    <BaseDialog open={open} setOpen={setOpen} title={title} className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "px-4 py-2.5 rounded-lg text-sm text-left transition-all duration-200",
              selected === option.value
                ? "bg-accent text-white font-bold"
                : "text-muted hover:text-white hover:bg-white/10"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </BaseDialog>
  )
}
