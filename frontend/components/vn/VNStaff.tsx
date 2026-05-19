/** Staff credits list on the VN page, grouped by role and split by edition. */
"use client"

import Link from "next/link"
import { enumMap } from "@/lib/enums"
import { displayName } from "@/lib/original"
import type { VN } from "@/lib/types"
import { useSearchContext } from "@/context/SearchContext"

type StaffEntry = VN["staff"][number]
type Edition = VN["editions"][number]

const ROLE_ORDER = [
  "scenario", "director", "chardesign", "art",
  "music", "songs", "translator", "editor", "qa", "staff",
]

interface VNStaffProps {
  staff: StaffEntry[]
  editions: Edition[]
}

export function VNStaff({ staff, editions }: VNStaffProps) {
  const STAFF_ROLE = enumMap('STAFF_ROLE')

  // Map eid (number) → edition name
  const editionMap = new Map<number, string>()
  for (const e of editions) {
    editionMap.set(Number(e.eid), e.name)
  }

  // Group by role
  const byRole = new Map<string, StaffEntry[]>()
  for (const s of staff) {
    const entries = byRole.get(s.role) ?? []
    entries.push(s)
    byRole.set(s.role, entries)
  }

  // Roles in display order (known first, then any unknown)
  const knownRoles = ROLE_ORDER.filter(r => byRole.has(r))
  const unknownRoles = [...byRole.keys()].filter(r => !ROLE_ORDER.includes(r))
  const orderedRoles = [...knownRoles, ...unknownRoles]

  // Check if we have any multi-edition roles
  const hasEditions = editions.length > 1

  return (
    <div className="flex flex-col gap-4">
      {orderedRoles.map(role => {
        const entries = byRole.get(role)!
        const roleLabel = STAFF_ROLE[role] ?? role

        // Sub-group by edition if needed
        let content: React.ReactNode

        if (hasEditions) {
          const byEdition = new Map<string, StaffEntry[]>()
          for (const s of entries) {
            const eidKey = s.eid != null ? (editionMap.get(s.eid) ?? `Edition ${s.eid}`) : "Original"
            const arr = byEdition.get(eidKey) ?? []
            arr.push(s)
            byEdition.set(eidKey, arr)
          }

          content = (
            <div className="flex flex-col gap-2">
              {[...byEdition.entries()].map(([editionName, edStaff]) => (
                <div key={editionName}>
                  <p className="text-xs text-muted/70 mb-1 italic">{editionName}</p>
                  <StaffList entries={edStaff} />
                </div>
              ))}
            </div>
          )
        } else {
          content = <StaffList entries={entries} />
        }

        return (
          <div key={role} className="flex gap-3">
            <span className="text-xs text-muted w-28 shrink-0 pt-0.5 font-medium">
              {roleLabel}
              <span className="ml-1 font-normal opacity-60">{entries.length}</span>
            </span>
            <div className="flex-1 min-w-0">{content}</div>
          </div>
        )
      })}
    </div>
  )
}

function StaffList({ entries }: { entries: StaffEntry[] }) {
  const { showOriginal } = useSearchContext()
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {entries.map((s, i) => (
        <span key={`${s.id}-${i}`} className="flex items-baseline gap-1.5 text-sm">
          <Link href={`/${s.id}`} className="text-white/90 hover:text-accent transition-colors">
            {displayName(s, showOriginal)}
          </Link>
          {s.note && (
            <span className="text-xs text-muted">{s.note}</span>
          )}
        </span>
      ))}
    </div>
  )
}
