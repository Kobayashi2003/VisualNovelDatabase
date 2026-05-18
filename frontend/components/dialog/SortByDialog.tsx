/** Sort-by picker dialog driven by the per-type options in `lib/config`. */

import { RadioGroupDialog } from "./RadioGroupDialog"
import { getSortOptions } from "@/lib/config"

interface SortByDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  type: string
  from: string
  sortBy: string
  setSortBy: (sortBy: string) => void
  className?: string
}

export function SortByDialog({ open, setOpen, type, from, sortBy, setSortBy, className }: SortByDialogProps) {
  const options = getSortOptions(type, from)

  return (
    <RadioGroupDialog
      open={open} setOpen={setOpen}
      title="Sort By"
      options={options}
      selected={sortBy} setSelected={setSortBy}
      className={className}
    />
  )
}
