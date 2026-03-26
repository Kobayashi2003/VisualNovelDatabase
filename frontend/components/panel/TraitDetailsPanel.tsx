import Link from "next/link"
import { Row } from "@/components/row/Row"
import { DescriptionRow } from "@/components/row/DescriptionRow"
import { Trait } from "@/lib/types"

export function TraitDetailsPanel({ trait }: { trait: Trait }) {
  return (
    <div className="flex flex-col gap-4 bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">{trait.name}</h1>
      </div>
      <div className="flex flex-col gap-2">
        {trait.group_name && (
          <Row label="Group" value={
            trait.group_id ? (
              <Link href={`/i/${trait.group_id.slice(1)}`} className="text-blue-400 hover:text-blue-500 transition-colors">
                {trait.group_name}
              </Link>
            ) : trait.group_name
          } />
        )}
        <Row label="Characters" value={trait.char_count > 0 ? trait.char_count.toString() : undefined} />
        {trait.aliases.length > 0 && (
          <Row label="Aliases" value={trait.aliases.join(", ")} />
        )}
        <Row label="Searchable" value={trait.searchable ? "Yes" : "No"} />
        <Row label="Applicable" value={trait.applicable ? "Yes" : "No"} />
        <DescriptionRow description={trait.description} />
      </div>
    </div>
  )
}
