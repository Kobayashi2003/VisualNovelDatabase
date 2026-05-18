/** "Move to another collection" target picker. */
"use client"

import { BaseDialog } from "@/components/dialog/BaseDialog"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MoveToDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  categories: Category[]
  currentCategoryId: number | null   // null = currently viewing "All"
  onMove: (targetCategoryId: number) => void
}

export function MoveToDialog({ open, setOpen, categories, currentCategoryId, onMove }: MoveToDialogProps) {
  const targets = categories.filter(c => c.id !== currentCategoryId)

  return (
    <BaseDialog open={open} setOpen={setOpen} title="Move to Collection" className="max-w-xs">
      {targets.length === 0 ? (
        <p className="text-sm text-muted text-center py-2">No other collections available.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {targets.map(cat => (
            <button
              key={cat.id}
              onClick={() => { onMove(cat.id); setOpen(false) }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left",
                "text-white hover:bg-white/10"
              )}
            >
              <span className="truncate">{cat.category_name}</span>
              <span className="text-xs text-muted shrink-0 ml-2">{cat.marks.length}</span>
            </button>
          ))}
        </div>
      )}
    </BaseDialog>
  )
}
