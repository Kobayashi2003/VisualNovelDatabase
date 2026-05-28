/** Staff detail sidebar: language / gender / aliases, links, collection button. */

import type { Staff } from "@/lib/types"
import { InfoRow, InlineList } from "@/components/common/InfoPrimitives"
import { LanguageIcons } from "@/components/common/LanguageIcons"
import { ExtLinks } from "@/components/common/ExtLinks"
import { CollectionButton } from "@/components/category/CollectionButton"
import { CollectionRating } from "@/components/category/CollectionRating"

const GENDER_LABEL: Record<string, string> = { m: "Male", f: "Female" }

export function StaffInfoPanel({ staff }: { staff: Staff }) {
  const hasInfo = staff.gender || staff.lang || staff.aliases.length > 0

  // Main alias first, then highlight it.
  const sortedAliases = [...staff.aliases].sort((a, b) => Number(b.is_main) - Number(a.is_main))

  return (
    <div className="flex flex-col gap-3">
      {hasInfo && (
        <div className="rounded-lg bg-surface border border-white/5 px-3 py-1">
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
        </div>
      )}

      <ExtLinks links={staff.extlinks} />

      <CollectionButton type="staff" id={staff.id} />
      <CollectionRating type="staff" id={staff.id} />
    </div>
  )
}
