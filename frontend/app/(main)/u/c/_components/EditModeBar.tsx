/** Floating batch-action bar for the user-collections edit mode — select-all,
 *  move, remove, and exit. A Spotify-style pill pinned to the bottom of the main
 *  column; shown only while edit mode is active. */
"use client"

import { CheckSquare, Square, FolderInput, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditModeBarProps {
  selectedCount: number
  allCurrentSelected: boolean
  hasCurrentPage: boolean
  canMove: boolean
  onToggleSelectAll: () => void
  onMove: () => void
  onDelete: () => void
  onClose: () => void
}

export function EditModeBar({
  selectedCount, allCurrentSelected, hasCurrentPage, canMove,
  onToggleSelectAll, onMove, onDelete, onClose,
}: EditModeBarProps) {
  return (
    <div className="fixed bottom-4 left-0 lg:left-64 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-1 p-1.5",
          "rounded-full bg-elevated/95 backdrop-blur-xl",
          "border border-white/15 shadow-2xl shadow-black/60",
          "transition-all duration-200 ease-out",
          "animate-slide-up-fade"
        )}
      >
        {/* Select all on current page */}
        <button
          onClick={onToggleSelectAll}
          disabled={!hasCurrentPage}
          className="flex items-center justify-center p-2 rounded-full text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={allCurrentSelected ? "Deselect all on page" : "Select all on page"}
        >
          {allCurrentSelected
            ? <CheckSquare className="w-4 h-4 text-accent" />
            : <Square className="w-4 h-4" />}
        </button>

        {/* Count */}
        <span className="text-sm font-medium text-white px-2 min-w-22 text-center select-none tabular-nums">
          {selectedCount} selected
        </span>

        <div className="w-px h-6 bg-white/15 mx-0.5" />

        {/* Move */}
        {canMove && (
          <button
            onClick={onMove}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Move to another collection"
          >
            <FolderInput className="w-4 h-4" />
            <span className="hidden sm:inline">Move</span>
          </button>
        )}

        {/* Remove */}
        <button
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-red-400 hover:bg-red-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Remove from collection"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Remove</span>
        </button>

        <div className="w-px h-6 bg-white/15 mx-0.5" />

        {/* Close edit mode */}
        <button
          onClick={onClose}
          className="flex items-center justify-center p-2 rounded-full text-muted hover:text-white hover:bg-white/10 transition-colors"
          title="Exit edit mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
