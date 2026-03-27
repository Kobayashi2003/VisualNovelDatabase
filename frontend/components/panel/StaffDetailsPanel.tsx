import { Row } from "@/components/row/Row"
import { DescriptionRow } from "@/components/row/DescriptionRow"
import { ExtlinksRow } from "@/components/row/ExtlinksRow"
import { Staff } from "@/lib/types"
import { ENUMS } from "@/lib/enums"

export function StaffDetailsPanel({ staff }: { staff: Staff }) {
  const mainTitle = staff.name
  const subTitle = staff.original || ""
  const mainAlias = staff.aliases?.find(a => a.is_main)
  const otherAliases = staff.aliases?.filter(a => !a.is_main) || []
  const lang = ENUMS.LANGUAGE[staff.lang as keyof typeof ENUMS.LANGUAGE] || staff.lang
  const extlinks = [...staff.extlinks,
    {
      url: `https://vndb.org/${staff.id}`,
      label: "VNDB",
      name: "VNDB",
      id: `https://vndb.org/${staff.id}`
    }
  ]

  return (
    <div className="flex flex-col gap-3 bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{mainTitle}</h1>
        <h2 className="text-sm text-gray-500">{subTitle}</h2>
      </div>
      <div className="flex flex-col gap-2">
        <Row label="Language" value={lang} />
        <Row label="Gender" value={staff.gender} />
        {otherAliases.length > 0 && (
          <Row label="Aliases" value={
            <div className="flex flex-wrap gap-1 items-center">
              {otherAliases.map((alias, index) => (
                <span key={alias.aid}>
                  {alias.name}{alias.latin ? ` (${alias.latin})` : ""}
                  {index < otherAliases.length - 1 && <span className="text-white/20 mx-1">•</span>}
                </span>
              ))}
            </div>
          } />
        )}
        <ExtlinksRow extlinks={extlinks} />
        <DescriptionRow description={staff.description} />
      </div>
    </div>
  )
}
