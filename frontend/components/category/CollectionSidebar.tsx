/** Left rail on the user-collections page: entity-type list + per-type category list. */
"use client"

import { useState, useRef, useEffect } from "react"
import {
  BookOpen, Package, User, Building2, Users, Tag, Sparkles,
  Library, Plus, Pencil, Trash2, Check, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { COLLECTION_TYPES } from "@/lib/constants"
import { useContainScroll } from "@/hooks/useScrollLock"
import type { Category } from "@/lib/types"

const TYPE_ICONS: Record<string, React.ElementType> = {
  vn: BookOpen, release: Package, character: User,
  producer: Building2, staff: Users, tag: Tag, trait: Sparkles,
}

interface CollectionSidebarProps {
  activeType: string
  activeCategory: number | "all"
  categories: Category[]
  totalsByType?: Record<string, number>        // optional pre-computed totals
  onTypeChange: (type: string) => void
  onCategorySelect: (id: number | "all") => void
  onCreate: (name: string) => Promise<void>
  onRename: (id: number, name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  className?: string
}

/* ─── Single category row ──────────────────────────────────────────────────── */

function CategoryRow({
  cat, active, onSelect, onRename, onDelete
}: {
  cat: Category
  active: boolean
  onSelect: () => void
  onRename: (name: string) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [mode, setMode] = useState<"view" | "rename" | "delete_confirm">("view")
  const [renameValue, setRenameValue] = useState(cat.category_name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === "rename") inputRef.current?.focus()
  }, [mode])

  const commitRename = async () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== cat.category_name) await onRename(trimmed)
    setMode("view")
  }

  if (mode === "rename") {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          ref={inputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") commitRename()
            if (e.key === "Escape") { setRenameValue(cat.category_name); setMode("view") }
          }}
          maxLength={32}
          className="flex-1 bg-elevated border border-accent/50 rounded px-2 py-0.5 text-sm text-white outline-none min-w-0"
        />
        <button onClick={commitRename} className="p-0.5 text-accent hover:text-accent-hover shrink-0">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { setRenameValue(cat.category_name); setMode("view") }} className="p-0.5 text-muted hover:text-white shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  if (mode === "delete_confirm") {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 mx-1">
        <span className="flex-1 text-xs text-red-400 truncate min-w-0">Delete &ldquo;{cat.category_name}&rdquo;?</span>
        <button
          onClick={async () => { await onDelete(); setMode("view") }}
          className="text-xs px-1.5 py-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode("view")}
          className="text-xs px-0.5 py-0.5 rounded text-muted hover:text-white shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer mx-1",
        active ? "bg-white/10 text-white" : "text-muted hover:text-white hover:bg-white/5"
      )}
      onClick={onSelect}
    >
      <span className="flex-1 truncate min-w-0">{cat.category_name}</span>
      <span className="text-xs text-muted shrink-0">{cat.marks.length}</span>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
        <button
          onClick={e => { e.stopPropagation(); setRenameValue(cat.category_name); setMode("rename") }}
          className="p-0.5 rounded text-muted hover:text-white hover:bg-white/10 transition-colors"
          title="Rename"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); setMode("delete_confirm") }}
          className="p-0.5 rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

/* ─── New collection inline form ───────────────────────────────────────────── */

function NewCategoryForm({ onConfirm, onCancel }: { onConfirm: (name: string) => Promise<void>; onCancel: () => void }) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const commit = async () => {
    const trimmed = value.trim()
    if (trimmed) await onConfirm(trimmed)
    onCancel()
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 mx-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel() }}
        placeholder="Collection name"
        maxLength={32}
        className="flex-1 bg-elevated border border-accent/50 rounded px-2 py-0.5 text-sm text-white placeholder:text-muted/50 outline-none min-w-0"
      />
      <button onClick={commit} className="p-0.5 text-accent hover:text-accent-hover shrink-0" title="Create">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="p-0.5 text-muted hover:text-white shrink-0" title="Cancel">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

/* ─── Main sidebar ─────────────────────────────────────────────────────────── */

export function CollectionSidebar({
  activeType, activeCategory, categories,
  onTypeChange, onCategorySelect, onCreate, onRename, onDelete,
  className
}: CollectionSidebarProps) {
  const [creating, setCreating] = useState(false)

  // Keep wheel/touch scrolling inside the rail: its pinned header/type-list
  // regions aren't scroll containers, so without this a wheel over them chains
  // straight through to the page behind (CSS `overscroll-contain` can't help a
  // non-scrollable region pre-Chrome 144).
  const rootRef = useRef<HTMLDivElement>(null)
  useContainScroll(rootRef)

  const activeTypeInfo = COLLECTION_TYPES.find(c => c.type === activeType)
  // Dedupe by mark id so the "All" count matches the data grid (an item present
  // in two categories is one item in the collection, not two).
  const allCount = (() => {
    const ids = new Set<number>()
    for (const c of categories) for (const m of c.marks) ids.add(m.id)
    return ids.size
  })()

  return (
    <div ref={rootRef} className={cn("flex flex-col bg-surface border-r border-white/10 overflow-hidden overscroll-contain", className)}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-xs font-bold text-muted tracking-widest uppercase">Your Library</h2>
      </div>

      {/* Type list */}
      <div className="px-1 pb-3 shrink-0">
        {COLLECTION_TYPES.map(ct => {
          const Icon = TYPE_ICONS[ct.type]
          return (
            <button
              key={ct.type}
              onClick={() => onTypeChange(ct.type)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                activeType === ct.type
                  ? "bg-white/10 text-white border-l-2 border-accent"
                  : "text-muted hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{ct.label}</span>
            </button>
          )
        })}
      </div>

      <div className="h-px bg-white/10 mx-3 mb-2 shrink-0" />

      {/* Category section heading */}
      <div className="px-4 pb-1 shrink-0">
        <span className="text-xs font-semibold text-muted/60 tracking-wider uppercase">Collections</span>
      </div>

      {/* "All" virtual row */}
      <div className="px-1 shrink-0">
        <button
          onClick={() => onCategorySelect("all")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors mx-0",
            activeCategory === "all"
              ? "bg-white/10 text-white"
              : "text-muted hover:text-white hover:bg-white/5"
          )}
        >
          <Library className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left truncate">
            All {activeTypeInfo?.label ?? activeType}s
          </span>
          {allCount > 0 && (
            <span className="text-xs text-muted shrink-0">{allCount}</span>
          )}
        </button>
      </div>

      {/* Category list (scrollable) */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-1 min-h-0">
        {categories.map(cat => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            active={activeCategory === cat.id}
            onSelect={() => onCategorySelect(cat.id)}
            onRename={(name) => onRename(cat.id, name)}
            onDelete={() => onDelete(cat.id)}
          />
        ))}

        {/* New collection */}
        <div className="px-1 mt-1">
          {creating ? (
            <NewCategoryForm onConfirm={onCreate} onCancel={() => setCreating(false)} />
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              New Collection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
