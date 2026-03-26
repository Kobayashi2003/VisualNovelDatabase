import Link from "next/link"
import { VN } from "@/lib/types"
import { ENUMS } from "@/lib/enums"

interface VNTagsPanelProps {
  vn: VN
  spoilerLevel: "0" | "1" | "2"
}

export function VNTagsPanel({ vn, spoilerLevel }: VNTagsPanelProps) {
  const filteredTags = vn.tags.filter(tag => tag.spoiler <= parseInt(spoilerLevel))

  const groupedTags = filteredTags.reduce((groups, tag) => {
    const category = tag.category || "other"
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(tag)
    return groups
  }, {} as Record<string, typeof filteredTags>)

  const categoryOrder = ["cont", "ero", "tech"]
  const sortedCategories = Object.entries(groupedTags).sort(([a], [b]) => {
    const aIndex = categoryOrder.indexOf(a)
    const bIndex = categoryOrder.indexOf(b)
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
  })

  if (filteredTags.length === 0) return null

  return (
    <div className="bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold">Tags</h2>
      {sortedCategories.map(([category, tags]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-white/60 mb-2">
            {ENUMS.CATEGORY[category as keyof typeof ENUMS.CATEGORY] || category}
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags
              .sort((a, b) => b.rating - a.rating)
              .map(tag => (
                <Link
                  key={tag.id}
                  href={`/g/${tag.id.slice(1)}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/5 hover:bg-white/10 text-blue-400 hover:text-blue-500 transition-colors border border-white/10"
                >
                  {tag.name}
                  <span className="text-white/30">{tag.rating.toFixed(1)}</span>
                  {tag.lie && <span className="text-red-400 text-[10px]">lie</span>}
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}