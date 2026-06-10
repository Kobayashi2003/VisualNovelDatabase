/** Trait detail sidebar: group / character count / aliases, collection controls. */

import type { Trait } from "@/lib/types"
import { InfoCard, InfoRow, InlineList } from "@/components/detail/InfoPrimitives"
import { CollectionControls } from "@/components/category/CollectionControls"

export function TraitInfoPanel({ trait, inline }: { trait: Trait; inline?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <InfoCard>
        {trait.group_name && (
          <InfoRow label="Group">{trait.group_name}</InfoRow>
        )}
        <InfoRow label="Characters">{trait.char_count.toLocaleString()}</InfoRow>
        {trait.aliases.length > 0 && (
          <InfoRow label="Aliases">
            <InlineList className="text-white/70" items={trait.aliases} />
          </InfoRow>
        )}
      </InfoCard>
      <CollectionControls type="trait" id={trait.id} inline={inline} />
    </div>
  )
}
