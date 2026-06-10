/** Producer detail sidebar: type / language / aliases, links, collection controls. */

import { enumLabel } from "@/lib/enums"
import type { Producer } from "@/lib/types"
import { InfoCard, InfoRow, InlineList } from "@/components/detail/InfoPrimitives"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { ExtLinks } from "@/components/common/ExtLinks"
import { CollectionControls } from "@/components/category/CollectionControls"

export function ProducerInfoPanel({ producer, inline }: { producer: Producer; inline?: boolean }) {
  const hasInfo = producer.type || producer.lang || producer.aliases.length > 0

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
        <InfoCard>
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
        </InfoCard>
      )}

      <ExtLinks links={producer.extlinks} />

      <CollectionControls type="producer" id={producer.id} inline={inline} />
    </div>
  )
}
