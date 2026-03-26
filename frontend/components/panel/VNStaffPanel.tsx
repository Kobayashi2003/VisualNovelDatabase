import Link from "next/link"
import { Row } from "@/components/row/Row"
import { VN } from "@/lib/types"
import { ENUMS } from "@/lib/enums"

const ROLE_ORDER = ["director", "chardesign", "scenario", "art", "music", "songs", "translator", "editor", "qa", "staff"] as const

export function VNStaffPanel({ vn }: { vn: VN }) {
  const staff = vn.staff

  if (!staff || staff.length === 0) return null

  const groupedStaff = staff.reduce((groups, member) => {
    const role = member.role || "staff"
    if (!groups[role]) groups[role] = []
    groups[role].push(member)
    return groups
  }, {} as Record<string, typeof staff>)

  const sortedRoles = Object.keys(groupedStaff).sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a as typeof ROLE_ORDER[number])
    const bi = ROLE_ORDER.indexOf(b as typeof ROLE_ORDER[number])
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  return (
    <div className="bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold">Staff</h2>
      <div className="flex flex-col gap-2">
        {sortedRoles.map(role => (
          <Row key={role} label={ENUMS.STAFF_ROLE[role as keyof typeof ENUMS.STAFF_ROLE] || role} value={
            <div className="flex flex-col gap-0.5">
              {groupedStaff[role].map((member, index) => (
                <div key={`${member.id}-${index}`} className="flex items-center gap-1.5">
                  <Link
                    href={`/${member.id[0]}/${member.id.slice(1)}`}
                    className="text-blue-400 hover:text-blue-500 transition-colors text-sm"
                  >
                    {member.name}
                  </Link>
                  {member.note && (
                    <span className="text-white/40 text-xs">({member.note})</span>
                  )}
                </div>
              ))}
            </div>
          } />
        ))}
      </div>
    </div>
  )
}
