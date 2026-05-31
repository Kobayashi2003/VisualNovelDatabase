/** Collection picker panel for detail pages — toggle the item in/out of each
 *  user category, or create a new collection (which the item joins on creation). */
"use client"

import { useEffect, useRef, useState } from "react"
import { BaseDialog } from "@/components/dialog/BaseDialog"
import { cn } from "@/lib/utils"
import { Check, Plus, Loader2, X } from "lucide-react"
import type { Category } from "@/lib/types"

interface CollectionDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  categories: Category[]
  markedCatIds: Set<number>
  onToggle: (categoryId: number) => Promise<void>
  onCreate: (name: string) => Promise<void>
}

export function CollectionDialog({
  open, setOpen, categories, markedCatIds, onToggle, onCreate,
}: CollectionDialogProps) {
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (creating) inputRef.current?.focus() }, [creating])

  // Reset the inline form on every close path (backdrop, ESC, X) so the dialog
  // never reopens still in "creating" mode.
  const handleSetOpen = (next: boolean) => {
    if (!next) { setCreating(false); setNewName("") }
    setOpen(next)
  }

  const handleToggle = async (catId: number) => {
    if (pendingId !== null) return
    setPendingId(catId)
    try { await onToggle(catId) } finally { setPendingId(null) }
  }

  const handleCreate = async () => {
    const trimmed = newName.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await onCreate(trimmed)
      setNewName("")
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <BaseDialog open={open} setOpen={handleSetOpen} title="Add to Collection" className="max-w-xs">
      <div className="flex flex-col gap-1">
        {categories.length === 0 && !creating && (
          <p className="text-sm text-muted text-center py-2">
            No collections yet. Create one below.
          </p>
        )}

        {categories.map(cat => {
          const marked = markedCatIds.has(cat.id)
          const pending = pendingId === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => handleToggle(cat.id)}
              disabled={pendingId !== null}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors disabled:cursor-not-allowed",
                marked ? "bg-accent/15 text-white" : "text-white/90 hover:bg-white/10",
                pendingId !== null && !pending && "opacity-50"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-4 h-4 rounded shrink-0 border transition-colors",
                  marked ? "bg-accent border-accent" : "border-white/25"
                )}
              >
                {pending
                  ? <Loader2 className="w-3 h-3 animate-spin text-white" />
                  : marked && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
              </span>
              <span className="flex-1 truncate">{cat.category_name}</span>
              <span className="text-xs text-muted shrink-0">{cat.marks.length}</span>
            </button>
          )
        })}

        {/* New collection */}
        <div className="mt-1 pt-2 border-t border-white/10">
          {creating ? (
            <div className="flex items-center gap-1 px-1">
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreate()
                  if (e.key === "Escape") { setNewName(""); setCreating(false) }
                }}
                placeholder="Collection name"
                maxLength={32}
                className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted outline-none focus:border-white/30 min-w-0"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="p-1.5 text-accent hover:text-accent-hover disabled:opacity-40 shrink-0"
                title="Create"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setNewName(""); setCreating(false) }}
                className="p-1.5 text-muted hover:text-white shrink-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              New Collection
            </button>
          )}
        </div>
      </div>
    </BaseDialog>
  )
}
