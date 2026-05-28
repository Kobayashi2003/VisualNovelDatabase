/** Trait detail sidebar: group / character count / aliases, collection button. */

import type { Trait } from "@/lib/types"
import { InfoRow, InlineList } from "@/components/common/InfoPrimitives"
import { CollectionButton } from "@/components/category/CollectionButton"
import { CollectionRating } from "@/components/category/CollectionRating"

export function TraitInfoPanel({ trait }: { trait: Trait }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
        {trait.group_name && (
          <InfoRow label="Group">{trait.group_name}</InfoRow>
        )}
        <InfoRow label="Characters">{trait.char_count.toLocaleString()}</InfoRow>
        {trait.aliases.length > 0 && (
          <InfoRow label="Aliases">
            <InlineList className="text-white/70" items={trait.aliases} />
          </InfoRow>
        )}
      </div>
      <CollectionButton type="trait" id={trait.id} />
      <CollectionRating type="trait" id={trait.id} />
    </div>
  )
}
