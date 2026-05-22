/** Producer detail sidebar: type / language / aliases, links, collection button. */

import { enumLabel } from "@/lib/enums"
import type { Producer } from "@/lib/types"
import { InfoRow, InlineList } from "@/components/common/InfoPrimitives"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { ExtLinks } from "@/components/common/ExtLinks"
import { CollectionButton } from "@/components/category/CollectionButton"

export function ProducerInfoPanel({ producer }: { producer: Producer }) {
  const hasInfo = producer.type || producer.lang || producer.aliases.length > 0

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
          {producer.type && (
            <InfoRow label="Type">{enumLabel('TYPE', producer.type)}</InfoRow>
          )}
          {producer.lang && (
            <InfoRow label="Language">
              <LanguageIcons langs={[producer.lang]} />
            </InfoRow>
          )}
          {producer.aliases.length > 0 && (
            <InfoRow label="Aliases">
              <InlineList className="text-white/70" items={producer.aliases} />
            </InfoRow>
          )}
        </div>
      )}

      <ExtLinks links={producer.extlinks} />

      <CollectionButton type="producer" id={producer.id} />
    </div>
  )
}
