import { Staff } from "@/lib/types"

import { StaffDetailsPanel } from "@/components/panel/StaffDetailsPanel"

interface StaffPageProps {
  staff: Staff
}

export default function StaffPage({ staff }: StaffPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <StaffDetailsPanel staff={staff} />
    </div>
  )
}
