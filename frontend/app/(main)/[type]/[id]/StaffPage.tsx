import { Staff } from "@/lib/types"

import { StaffDetailsPanel } from "@/components/panel/StaffDetailsPanel"
import { RelatedVNsPanel } from "@/components/panel/RelatedVNsPanel"

interface StaffPageProps {
  staff: Staff
}

export default function StaffPage({ staff }: StaffPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <StaffDetailsPanel staff={staff} />
      <RelatedVNsPanel
        title="Visual Novels"
        searchParams={{ staff_id: staff.id }}
      />
    </div>
  )
}
