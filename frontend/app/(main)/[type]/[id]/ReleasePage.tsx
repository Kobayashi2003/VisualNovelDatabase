import { Release } from "@/lib/types"

import { ReleaseDetailsPanel } from "@/components/panel/ReleaseDetailsPanel"

interface ReleasePageProps {
  release: Release
}

export default function ReleasePage({ release }: ReleasePageProps) {
  return (
    <div className="flex flex-col gap-4">
      <ReleaseDetailsPanel release={release} />
    </div>
  )
}
