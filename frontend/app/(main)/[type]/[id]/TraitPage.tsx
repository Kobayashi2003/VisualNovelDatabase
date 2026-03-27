import { Trait } from "@/lib/types"

import { TraitDetailsPanel } from "@/components/panel/TraitDetailsPanel"
import { RelatedCharactersPanel } from "@/components/panel/RelatedCharactersPanel"

interface TraitPageProps {
  trait: Trait
}

export default function TraitPage({ trait }: TraitPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <TraitDetailsPanel trait={trait} />
      <RelatedCharactersPanel
        title="Characters"
        searchParams={{ trait: trait.name }}
      />
    </div>
  )
}
