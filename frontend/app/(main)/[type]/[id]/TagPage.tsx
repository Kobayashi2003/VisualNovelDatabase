import { Tag } from "@/lib/types"

import { TagDetailsPanel } from "@/components/panel/TagDetailsPanel"
import { RelatedVNsPanel } from "@/components/panel/RelatedVNsPanel"

interface TagPageProps {
  tag: Tag
}

export default function TagPage({ tag }: TagPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <TagDetailsPanel tag={tag} />
      <RelatedVNsPanel
        title="Visual Novels"
        searchParams={{ tag: tag.name }}
      />
    </div>
  )
}
