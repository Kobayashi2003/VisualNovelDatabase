/** Tag detail sidebar: category / VN count / aliases, collection controls. */

import { enumLabel } from "@/lib/enums"
import type { Tag } from "@/lib/types"
import { InfoCard, InfoRow, InlineList } from "@/components/detail/InfoPrimitives"
import { CollectionControls } from "@/components/category/CollectionControls"

export function TagInfoPanel({ tag, inline }: { tag: Tag; inline?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <InfoCard>
        {tag.category && (
          <InfoRow label="Category">{enumLabel('CATEGORY', tag.category)}</InfoRow>
        )}
        <InfoRow label="Visual Novels">{tag.vn_count.toLocaleString()}</InfoRow>
        {tag.aliases.length > 0 && (
          <InfoRow label="Aliases">
            <InlineList className="text-white/70" items={tag.aliases} />
          </InfoRow>
        )}
      </InfoCard>
      <CollectionControls type="tag" id={tag.id} inline={inline} />
    </div>
  )
}
