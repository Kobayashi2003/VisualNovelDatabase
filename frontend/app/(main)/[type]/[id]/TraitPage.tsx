import { Trait } from "@/lib/types"

import { TraitDetailsPanel } from "@/components/panel/TraitDetailsPanel"

interface TraitPageProps {
  trait: Trait
}

export default function TraitPage({ trait }: TraitPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <TraitDetailsPanel trait={trait} />
    </div>
  )
}
