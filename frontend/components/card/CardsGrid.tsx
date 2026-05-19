/** Per-entity card grids used by search results and the user-collections page. */
"use client"

import { cn, formatRelativeDate, shouldBlur } from "@/lib/utils"
import { X, FolderInput, Check } from "lucide-react"
import { ImageCard } from "./ImageCard"
import { ImageCard2 } from "./ImageCard2"
import { TextCard } from "./TextCard"
import { CompactRow } from "./CompactRow"
import { enumLabel } from "@/lib/enums"
import { useSearchContext } from "@/context/SearchContext"
import { displayTitle as displayTitleFn, displayName as displayNameFn } from "@/lib/original"

import {
  VN_Small, Release_Small, Character_Small, Producer_Small,
  Staff_Small, Tag_Small, Trait_Small,
} from "@/lib/types"


/* ─── Generic image card (handles content-rating blur) ─────────────────────── */

type ImageProps = {
  url: string
  dims: [number, number]
  thumbnail?: string
  thumbnail_dims?: [number, number]
  sexual: number
  violence: number
}

interface GenImageCardProps {
  image?: ImageProps
  title: string
  msgs: string[]
  link?: string
  sexualLevel?: "safe" | "suggestive" | "explicit"
  violenceLevel?: "tame" | "violent" | "brutal"
  layout?: "single" | "grid"
  className?: string
  isGuest?: boolean
  tooltip?: string
}

const BLUR = "blur-lg hover:blur-none"

function getBlurClass(
  image: ImageProps | undefined,
  sexualLevel: string,
  violenceLevel: string
): string {
  if (!image) return ""
  return shouldBlur(image.sexual, image.violence, sexualLevel, violenceLevel) ? BLUR : ""
}

export function GenImageCard({
  image, title, msgs, link,
  sexualLevel = "safe", violenceLevel = "tame",
  layout = "grid", className, isGuest, tooltip
}: GenImageCardProps) {
  const blurClass = getBlurClass(image, sexualLevel, violenceLevel)
  const imgUrl = image?.thumbnail || image?.url || ""

  // Guests cannot view or navigate to non-safe+tame images
  const isRestricted = !!(isGuest && getBlurClass(image, "safe", "tame") !== "")
  const effectiveUrl = isRestricted ? "" : imgUrl
  const effectiveLink = isRestricted ? undefined : link

  return layout === "grid" ? (
    <ImageCard
      url={effectiveUrl}
      title={title}
      msgs={msgs}
      link={effectiveLink}
      restricted={isRestricted}
      className={cn(className, !isRestricted && blurClass, "transition-all duration-300")}
      tooltip={tooltip}
    />
  ) : (
    <ImageCard2
      url={effectiveUrl}
      title={title}
      msgs={msgs}
      link={effectiveLink}
      restricted={isRestricted}
      className={cn(className, !isRestricted && blurClass, "transition-all duration-300")}
      tooltip={tooltip}
    />
  )
}

const gridClass = (layout: "single" | "grid") =>
  layout === "grid"
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"
    : "flex flex-col gap-2"

/* ─── Shared collection props + hover-action wrapper ──────────────────────── */
export interface CollectionCardProps {
  view?: "grid" | "list" | "compact"
  onRemove?: (id: string) => void
  onMove?: (id: string) => void
  editMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  markedAtMap?: Record<string, string>
}

// Adds hover-actions (remove/move), edit-mode checkbox, and a date-added badge
// on top of any card. Used to make the same card components reusable across
// search results (plain) and the user-collections page (with collection chrome).
function CollectionWrapper({
  id, children,
  onRemove, onMove, editMode, selectedIds, onToggleSelect, markedAtMap
}: CollectionCardProps & { id: string; children: React.ReactNode }) {
  const selected = selectedIds?.has(id)
  const markedAt = markedAtMap?.[id]
  const isActive = !!(onRemove || onMove || editMode)
  if (!isActive) return <>{children}</>

  return (
    <div className={cn("relative group", selected && "ring-2 ring-accent rounded-lg overflow-hidden")}>
      {children}

      {editMode && (
        <>
          {/* Click-capture overlay: clicking the card toggles selection instead of navigating */}
          <button
            type="button"
            onClick={() => onToggleSelect?.(id)}
            aria-label={selected ? "Deselect" : "Select"}
            className="absolute inset-0 z-10 cursor-pointer rounded-lg"
          />
          {/* Custom checkbox indicator */}
          <div className="absolute top-1.5 left-1.5 z-20 pointer-events-none">
            <div className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
              selected
                ? "bg-accent border-accent shadow-md"
                : "bg-black/50 border-white/70 backdrop-blur-sm"
            )}>
              {selected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
            </div>
          </div>
        </>
      )}

      {!editMode && (onRemove || onMove) && (
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onMove && (
            <button
              onClick={e => { e.preventDefault(); onMove(id) }}
              className="p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
              title="Move to..."
            >
              <FolderInput className="w-3 h-3" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={e => { e.preventDefault(); onRemove(id) }}
              className="p-1 rounded-full bg-black/70 text-white hover:bg-red-500/80 transition-colors"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {markedAt && !editMode && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-xs text-white/80 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-b">
          Added {formatRelativeDate(markedAt)}
        </div>
      )}
    </div>
  )
}

/* ─── VNs ──────────────────────────────────────────────────────────────────── */
interface VNsCardsGridProps extends CollectionCardProps {
  vns: VN_Small[]
  cardType?: "image" | "text"
  layout?: "single" | "grid"
  sexualLevel?: "safe" | "suggestive" | "explicit"
  violenceLevel?: "tame" | "violent" | "brutal"
  isGuest?: boolean
}

export function VNsCardsGrid({
  vns, cardType = "image", layout = "grid",
  sexualLevel = "safe", violenceLevel = "tame",
  isGuest,
  view, onRemove, onMove, editMode, selectedIds, onToggleSelect, markedAtMap
}: VNsCardsGridProps) {
  const { showOriginal } = useSearchContext()
  const effectiveLayout: "single" | "grid" = view === "list" ? "single" : view === "grid" ? "grid" : layout

  if (view === "compact") {
    return (
      <div className="flex flex-col">
        {vns.map((vn, idx) => {
          const developer = vn.developers?.[0] ? displayNameFn(vn.developers[0], showOriginal) : ""
          const year = vn.released ? vn.released.substring(0, 4) : ""
          const subtitle = [developer, year].filter(Boolean).join(" · ")
          return (
            <CompactRow
              key={vn.id}
              index={idx + 1}
              title={displayTitleFn(vn, showOriginal)}
              subtitle={subtitle}
              thumbnail={vn.image?.thumbnail || vn.image?.url}
              markedAt={markedAtMap?.[vn.id]}
              onRemove={onRemove ? () => onRemove(vn.id) : undefined}
              onMove={onMove ? () => onMove(vn.id) : undefined}
              selected={selectedIds?.has(vn.id)}
              editMode={editMode}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(vn.id) : undefined}
              link={`/${vn.id}`}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={gridClass(effectiveLayout)}>
      {vns.map((vn) => {
        const developer = vn.developers?.[0] ? displayNameFn(vn.developers[0], showOriginal) : ""
        const released = vn.released || ""
        const msgs = [developer, released].filter(Boolean)
        return (
          <CollectionWrapper
            key={vn.id} id={vn.id}
            onRemove={onRemove} onMove={onMove}
            editMode={editMode} selectedIds={selectedIds}
            onToggleSelect={onToggleSelect} markedAtMap={markedAtMap}
          >
            {cardType === "text" ? (
              <TextCard title={displayTitleFn(vn, showOriginal)} msgs={msgs} link={`/${vn.id}`} layout={effectiveLayout} />
            ) : (
              <GenImageCard
                image={vn.image} title={displayTitleFn(vn, showOriginal)} msgs={msgs} link={`/${vn.id}`}
                sexualLevel={sexualLevel} violenceLevel={violenceLevel} layout={effectiveLayout}
                isGuest={isGuest}
              />
            )}
          </CollectionWrapper>
        )
      })}
    </div>
  )
}

/* ─── Releases ─────────────────────────────────────────────────────────────── */
interface ReleasesCardsGridProps extends CollectionCardProps {
  releases: Release_Small[]
  layout?: "single" | "grid"
}

export function ReleasesCardsGrid({
  releases, layout = "grid",
  view, onRemove, onMove, editMode, selectedIds, onToggleSelect, markedAtMap
}: ReleasesCardsGridProps) {
  const { showOriginal } = useSearchContext()
  const effectiveLayout: "single" | "grid" = view === "list" ? "single" : view === "grid" ? "grid" : layout

  if (view === "compact") {
    return (
      <div className="flex flex-col">
        {releases.map((r, idx) => {
          const langs = r.languages?.map(l => l.lang).join(", ") || ""
          return (
            <CompactRow
              key={r.id} index={idx + 1} title={displayTitleFn(r, showOriginal)}
              subtitle={[r.released, langs].filter(Boolean).join(" · ")}
              markedAt={markedAtMap?.[r.id]}
              onRemove={onRemove ? () => onRemove(r.id) : undefined}
              onMove={onMove ? () => onMove(r.id) : undefined}
              selected={selectedIds?.has(r.id)} editMode={editMode}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(r.id) : undefined}
              link={`/${r.id}`}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={gridClass(effectiveLayout)}>
      {releases.map((r) => {
        const langs = r.languages?.map(l => l.lang).join(", ") || ""
        return (
          <CollectionWrapper
            key={r.id} id={r.id}
            onRemove={onRemove} onMove={onMove}
            editMode={editMode} selectedIds={selectedIds}
            onToggleSelect={onToggleSelect} markedAtMap={markedAtMap}
          >
            <TextCard title={displayTitleFn(r, showOriginal)} msgs={[r.released, langs].filter(Boolean)} link={`/${r.id}`} layout={effectiveLayout} />
          </CollectionWrapper>
        )
      })}
    </div>
  )
}

/* ─── Characters ───────────────────────────────────────────────────────────── */
interface CharactersCardsGridProps extends CollectionCardProps {
  characters: Character_Small[]
  cardType?: "image" | "text"
  layout?: "single" | "grid"
  sexualLevel?: "safe" | "suggestive" | "explicit"
  violenceLevel?: "tame" | "violent" | "brutal"
}

export function CharactersCardsGrid({
  characters, cardType = "image", layout = "grid",
  sexualLevel = "safe", violenceLevel = "tame",
  view, onRemove, onMove, editMode, selectedIds, onToggleSelect, markedAtMap
}: CharactersCardsGridProps) {
  const { showOriginal } = useSearchContext()
  const effectiveLayout: "single" | "grid" = view === "list" ? "single" : view === "grid" ? "grid" : layout

  if (view === "compact") {
    return (
      <div className="flex flex-col">
        {characters.map((c, idx) => {
          const role = c.vns?.[0]?.role ? enumLabel('CHARACTER_ROLE', c.vns[0].role) : ""
          const subtitle = role
          return (
            <CompactRow
              key={c.id} index={idx + 1} title={displayNameFn(c, showOriginal)}
              subtitle={subtitle}
              thumbnail={c.image?.url}
              markedAt={markedAtMap?.[c.id]}
              onRemove={onRemove ? () => onRemove(c.id) : undefined}
              onMove={onMove ? () => onMove(c.id) : undefined}
              selected={selectedIds?.has(c.id)} editMode={editMode}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(c.id) : undefined}
              link={`/${c.id}`}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={gridClass(effectiveLayout)}>
      {characters.map((c) => {
        const role = c.vns?.[0]?.role ? enumLabel('CHARACTER_ROLE', c.vns[0].role) : ""
        const name = displayNameFn(c, showOriginal)
        const msgs = [role].filter(Boolean) as string[]
        return (
          <CollectionWrapper
            key={c.id} id={c.id}
            onRemove={onRemove} onMove={onMove}
            editMode={editMode} selectedIds={selectedIds}
            onToggleSelect={onToggleSelect} markedAtMap={markedAtMap}
          >
            {cardType === "text" ? (
              <TextCard title={name} msgs={msgs} link={`/${c.id}`} layout={effectiveLayout} />
            ) : (
              <GenImageCard
                image={c.image} title={name} msgs={msgs} link={`/${c.id}`}
                sexualLevel={sexualLevel} violenceLevel={violenceLevel} layout={effectiveLayout}
              />
            )}
          </CollectionWrapper>
        )
      })}
    </div>
  )
}

/* ─── Producers ────────────────────────────────────────────────────────────── */
interface ProducersCardsGridProps extends CollectionCardProps {
  producers: Producer_Small[]
  layout?: "single" | "grid"
}

export function ProducersCardsGrid({
  producers, layout = "grid",
  view, onRemove, onMove, editMode, selectedIds, onToggleSelect, markedAtMap
}: ProducersCardsGridProps) {
  const { showOriginal } = useSearchContext()
  const effectiveLayout: "single" | "grid" = view === "list" ? "single" : view === "grid" ? "grid" : layout

  if (view === "compact") {
    return (
      <div className="flex flex-col">
        {producers.map((p, idx) => (
          <CompactRow
            key={p.id} index={idx + 1}
            title={displayNameFn(p, showOriginal)}
            markedAt={markedAtMap?.[p.id]}
            onRemove={onRemove ? () => onRemove(p.id) : undefined}
            onMove={onMove ? () => onMove(p.id) : undefined}
            selected={selectedIds?.has(p.id)} editMode={editMode}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(p.id) : undefined}
            link={`/${p.id}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass(effectiveLayout)}>
      {producers.map((p) => {
        return (
          <CollectionWrapper
            key={p.id} id={p.id}
            onRemove={onRemove} onMove={onMove}
            editMode={editMode} selectedIds={selectedIds}
            onToggleSelect={onToggleSelect} markedAtMap={markedAtMap}
          >
            <TextCard title={displayNameFn(p, showOriginal)} msgs={[]} link={`/${p.id}`} layout={effectiveLayout} />
          </CollectionWrapper>
        )
      })}
    </div>
  )
}

/* ─── Staff ────────────────────────────────────────────────────────────────── */
interface StaffCardsGridProps extends CollectionCardProps {
  staff: Staff_Small[]
  layout?: "single" | "grid"
}

export function StaffCardsGrid({
  staff, layout = "grid",
  view, onRemove, onMove, editMode, selectedIds, onToggleSelect, markedAtMap
}: StaffCardsGridProps) {
  const { showOriginal } = useSearchContext()
  const effectiveLayout: "single" | "grid" = view === "list" ? "single" : view === "grid" ? "grid" : layout

  if (view === "compact") {
    return (
      <div className="flex flex-col">
        {staff.map((s, idx) => (
          <CompactRow
            key={s.id} index={idx + 1}
            title={displayNameFn(s, showOriginal)}
            markedAt={markedAtMap?.[s.id]}
            onRemove={onRemove ? () => onRemove(s.id) : undefined}
            onMove={onMove ? () => onMove(s.id) : undefined}
            selected={selectedIds?.has(s.id)} editMode={editMode}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(s.id) : undefined}
            link={`/${s.id}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass(effectiveLayout)}>
      {staff.map((s) => {
        return (
          <CollectionWrapper
            key={s.id} id={s.id}
            onRemove={onRemove} onMove={onMove}
            editMode={editMode} selectedIds={selectedIds}
            onToggleSelect={onToggleSelect} markedAtMap={markedAtMap}
          >
            <TextCard title={displayNameFn(s, showOriginal)} msgs={[]} link={`/${s.id}`} layout={effectiveLayout} />
          </CollectionWrapper>
        )
      })}
    </div>
  )
}

/* ─── Tags ─────────────────────────────────────────────────────────────────── */
interface TagsCardsGridProps extends CollectionCardProps {
  tags: Tag_Small[]
  layout?: "single" | "grid"
}

export function TagsCardsGrid({
  tags, layout = "grid",
  view, onRemove, onMove, editMode, selectedIds, onToggleSelect, markedAtMap
}: TagsCardsGridProps) {
  const effectiveLayout: "single" | "grid" = view === "list" ? "single" : view === "grid" ? "grid" : layout

  if (view === "compact") {
    return (
      <div className="flex flex-col">
        {tags.map((t, idx) => (
          <CompactRow
            key={t.id} index={idx + 1} title={t.name}
            subtitle={t.category}
            markedAt={markedAtMap?.[t.id]}
            onRemove={onRemove ? () => onRemove(t.id) : undefined}
            onMove={onMove ? () => onMove(t.id) : undefined}
            selected={selectedIds?.has(t.id)} editMode={editMode}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(t.id) : undefined}
            link={`/${t.id}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass(effectiveLayout)}>
      {tags.map((t) => (
        <CollectionWrapper
          key={t.id} id={t.id}
          onRemove={onRemove} onMove={onMove}
          editMode={editMode} selectedIds={selectedIds}
          onToggleSelect={onToggleSelect} markedAtMap={markedAtMap}
        >
          <TextCard title={t.name} msgs={[t.category]} link={`/${t.id}`} layout={effectiveLayout} />
        </CollectionWrapper>
      ))}
    </div>
  )
}

/* ─── Traits ───────────────────────────────────────────────────────────────── */
interface TraitsCardsGridProps extends CollectionCardProps {
  traits: Trait_Small[]
  layout?: "single" | "grid"
}

export function TraitsCardsGrid({
  traits, layout = "grid",
  view, onRemove, onMove, editMode, selectedIds, onToggleSelect, markedAtMap
}: TraitsCardsGridProps) {
  const effectiveLayout: "single" | "grid" = view === "list" ? "single" : view === "grid" ? "grid" : layout

  if (view === "compact") {
    return (
      <div className="flex flex-col">
        {traits.map((t, idx) => (
          <CompactRow
            key={t.id} index={idx + 1} title={t.name}
            subtitle={t.group_name}
            markedAt={markedAtMap?.[t.id]}
            onRemove={onRemove ? () => onRemove(t.id) : undefined}
            onMove={onMove ? () => onMove(t.id) : undefined}
            selected={selectedIds?.has(t.id)} editMode={editMode}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(t.id) : undefined}
            link={`/${t.id}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass(effectiveLayout)}>
      {traits.map((t) => (
        <CollectionWrapper
          key={t.id} id={t.id}
          onRemove={onRemove} onMove={onMove}
          editMode={editMode} selectedIds={selectedIds}
          onToggleSelect={onToggleSelect} markedAtMap={markedAtMap}
        >
          <TextCard title={t.name} msgs={[t.group_name || ""].filter(Boolean)} link={`/${t.id}`} layout={effectiveLayout} />
        </CollectionWrapper>
      ))}
    </div>
  )
}
