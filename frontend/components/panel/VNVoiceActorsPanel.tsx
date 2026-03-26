import Link from "next/link"
import { VN } from "@/lib/types"

export function VNVoiceActorsPanel({ vn }: { vn: VN }) {
  const va = vn.va

  if (!va || va.length === 0) return null

  return (
    <div className="bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold">Voice Actors</h2>
      <div className="flex flex-col gap-1">
        {va.map((entry, index) => (
          <div key={index} className="flex flex-wrap items-center gap-1.5 py-1 border-b border-white/5 last:border-0">
            <Link
              href={`/${entry.staff.id[0]}/${entry.staff.id.slice(1)}`}
              className="text-blue-400 hover:text-blue-500 transition-colors text-sm"
            >
              {entry.staff.name}
            </Link>
            <span className="text-white/30 text-xs">as</span>
            <Link
              href={`/${entry.character.id[0]}/${entry.character.id.slice(1)}`}
              className="text-blue-400 hover:text-blue-500 transition-colors text-sm"
            >
              {entry.character.name}
            </Link>
            {entry.note && (
              <span className="text-white/40 text-xs">({entry.note})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
