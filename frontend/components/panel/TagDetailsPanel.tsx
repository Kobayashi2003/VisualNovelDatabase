import { Row } from "@/components/row/Row"
import { DescriptionRow } from "@/components/row/DescriptionRow"
import { Tag } from "@/lib/types"
import { ENUMS } from "@/lib/enums"

export function TagDetailsPanel({ tag }: { tag: Tag }) {
  const category = ENUMS.CATEGORY[tag.category as keyof typeof ENUMS.CATEGORY] || tag.category

  return (
    <div className="flex flex-col gap-4 bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">{tag.name}</h1>
      </div>
      <div className="flex flex-col gap-2">
        <Row label="Category" value={category} />
        <Row label="VN Count" value={tag.vn_count > 0 ? tag.vn_count.toString() : undefined} />
        {tag.aliases.length > 0 && (
          <Row label="Aliases" value={tag.aliases.join(", ")} />
        )}
        <Row label="Searchable" value={tag.searchable ? "Yes" : "No"} />
        <Row label="Applicable" value={tag.applicable ? "Yes" : "No"} />
        <DescriptionRow description={tag.description} />
      </div>
    </div>
  )
}
