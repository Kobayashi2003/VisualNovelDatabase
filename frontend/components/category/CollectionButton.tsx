/** "Add to Collection" button on detail pages — toggles marks per user category. */
"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import { COLLECTION_TYPE_MAP } from "@/lib/constants"
import type { Category } from "@/lib/types"

type ResourceType = "vn" | "release" | "character" | "producer" | "staff" | "tag" | "trait"

interface CollectionButtonProps {
  type: ResourceType
  id: string
}

export function CollectionButton({ type, id }: CollectionButtonProps) {
  const { user } = useUserContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [markedCatIds, setMarkedCatIds] = useState<Set<number>>(new Set())
  const markId = parseInt(id.replace(new RegExp(`^${COLLECTION_TYPE_MAP[type].route}`), ""), 10)

  const refresh = useCallback(async () => {
    const cats = await api.category.get(type)
    setCategories(cats)
    const marked = new Set<number>()
    for (const c of cats) {
      if (c.marks.some(m => m.id === markId)) marked.add(c.id)
    }
    setMarkedCatIds(marked)
  }, [type, markId])

  useEffect(() => { if (user) refresh() }, [user, refresh])

  if (!user) return null
  const isAnyMarked = markedCatIds.size > 0

  const toggle = async (catId: number) => {
    if (markedCatIds.has(catId)) {
      await api.category.removeMark(type, catId, markId)
    } else {
      await api.category.addMark(type, catId, markId)
    }
    await refresh()
  }

  return (
    <div className="relative mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full py-2 rounded-lg text-sm font-semibold transition-colors",
          isAnyMarked ? "bg-accent text-black hover:bg-accent/80" : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {isAnyMarked ? "In Collection ✓" : "Add to Collection"}
      </button>
      {open && categories.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-elevated border border-white/10 rounded-lg shadow-lg overflow-hidden">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              <span className="text-white/90">{cat.category_name}</span>
              {markedCatIds.has(cat.id) && <span className="text-accent text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
