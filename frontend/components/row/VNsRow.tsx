import Link from "next/link"
import { Row } from "@/components/row/Row"
import { ENUMS } from "@/lib/enums"

interface VN {
  id: string
  role: string
  title: string
  release?: {
    id: string
    title: string
  }
}

interface VNsRowProps {
  vns: VN[]
}

export function VNsRow({ vns }: VNsRowProps) {
  if (vns.length === 0) return null

  const groupedVNs = vns.reduce((groups, vn) => {
    if (!groups[vn.title]) {
      groups[vn.title] = []
    }
    groups[vn.title].push(vn)
    return groups
  }, {} as Record<string, VN[]>)

  const sortedGroups = Object.entries(groupedVNs).sort(([a], [b]) => a.localeCompare(b))

  return (
    <Row label="Visual Novels" value={
      <div className="flex flex-col gap-1">
        {sortedGroups.map(([title, items]) => (
          <div key={title} className="flex flex-col gap-0.5">
            <div className="flex flex-wrap gap-1 items-center">
              <Link href={`/${items[0].id[0]}/${items[0].id.slice(1)}`} className="text-blue-400 hover:text-blue-500 transition-colors">
                {title}
              </Link>
              <span className="text-white/40 text-xs">
                ({items.map(item => ENUMS.CHARACTER_ROLE[item.role as keyof typeof ENUMS.CHARACTER_ROLE] || item.role).join(", ")})
              </span>
            </div>
            {items.map((item) => item.release && (
              <div key={`${item.id}-${item.release.id}`} className="ml-4 text-xs text-white/50">
                <Link href={`/${item.release.id[0]}/${item.release.id.slice(1)}`} className="text-blue-400/60 hover:text-blue-500 transition-colors">
                  {item.release.title}
                </Link>
              </div>
            ))}
          </div>
        ))}
      </div>
    } />
  )
}