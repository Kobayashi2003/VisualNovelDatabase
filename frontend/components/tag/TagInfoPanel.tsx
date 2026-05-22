/** Tag detail sidebar: category / VN count / aliases, collection button. */

import { enumLabel } from "@/lib/enums"
import type { Tag } from "@/lib/types"
import { InfoRow, InlineList } from "@/components/common/InfoPrimitives"
import { CollectionButton } from "@/components/category/CollectionButton"

export function TagInfoPanel({ tag }: { tag: Tag }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
        {tag.category && (
          <InfoRow label="Category">{enumLabel('CATEGORY', tag.category)}</InfoRow>
        )}
        <InfoRow label="Visual Novels">{tag.vn_count.toLocaleString()}</InfoRow>
        {tag.aliases.length > 0 && (
          <InfoRow label="Aliases">
            <InlineList className="text-white/70" items={tag.aliases} />
          </InfoRow>
        )}
      </div>
      <CollectionButton type="tag" id={tag.id} />
    </div>
  )
}
