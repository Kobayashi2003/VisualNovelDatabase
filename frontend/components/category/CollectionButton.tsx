/** "Add to Collection" button on detail pages — opens a panel to toggle marks
 *  per user category. */
"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import { COLLECTION_TYPE_MAP } from "@/lib/constants"
import { CollectionDialog } from "./CollectionDialog"
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

  // Create a collection and add the current item to it in one step.
  const create = async (name: string) => {
    const cat = await api.category.create(type, name)
    await api.category.addMark(type, cat.id, markId)
    await refresh()
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "w-full py-2 rounded-lg text-sm font-semibold transition-colors",
          isAnyMarked ? "bg-accent text-black hover:bg-accent/80" : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {isAnyMarked ? "In Collection ✓" : "Add to Collection"}
      </button>
      <CollectionDialog
        open={open}
        setOpen={setOpen}
        categories={categories}
        markedCatIds={markedCatIds}
        onToggle={toggle}
        onCreate={create}
      />
    </div>
  )
}
