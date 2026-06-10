/** Staff detail sidebar: language / gender / aliases, links, collection controls. */

import type { Staff } from "@/lib/types"
import { InfoCard, InfoRow, InlineList } from "@/components/detail/InfoPrimitives"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { ExtLinks } from "@/components/common/ExtLinks"
import { CollectionControls } from "@/components/category/CollectionControls"

const GENDER_LABEL: Record<string, string> = { m: "Male", f: "Female" }

export function StaffInfoPanel({ staff, inline }: { staff: Staff; inline?: boolean }) {
  const hasInfo = staff.gender || staff.lang || staff.aliases.length > 0

  // Main alias first, then highlight it.
  const sortedAliases = [...staff.aliases].sort((a, b) => Number(b.is_main) - Number(a.is_main))

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
        <InfoCard>
          {staff.lang && (
            <InfoRow label="Language">
              <LanguageIcons langs={[staff.lang]} />
            </InfoRow>
          )}
          {staff.gender && (
            <InfoRow label="Gender">
              {GENDER_LABEL[staff.gender] ?? staff.gender}
            </InfoRow>
          )}
          {sortedAliases.length > 0 && (
            <InfoRow label="Aliases">
              <InlineList
                items={sortedAliases.map(alias => (
                  <span key={alias.aid} className={alias.is_main ? "text-accent" : "text-white/70"}>
                    {alias.name}
                  </span>
                ))}
              />
            </InfoRow>
          )}
        </InfoCard>
      )}

      <ExtLinks links={staff.extlinks} />

      <CollectionControls type="staff" id={staff.id} inline={inline} />
    </div>
  )
}
