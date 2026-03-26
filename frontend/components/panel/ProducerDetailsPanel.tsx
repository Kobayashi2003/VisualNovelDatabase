import { Row } from "@/components/row/Row"
import { DescriptionRow } from "@/components/row/DescriptionRow"
import { ExtlinksRow } from "@/components/row/ExtlinksRow"
import { Producer } from "@/lib/types"
import { ENUMS } from "@/lib/enums"

export function ProducerDetailsPanel({ producer }: { producer: Producer }) {
  const mainTitle = producer.name
  const subTitle = producer.original || ""
  const lang = ENUMS.LANGUAGE[producer.lang as keyof typeof ENUMS.LANGUAGE] || producer.lang
  const type = ENUMS.TYPE[producer.type as keyof typeof ENUMS.TYPE] || producer.type
  const extlinks = [...producer.extlinks,
    {
      url: `https://vndb.org/${producer.id}`,
      label: "VNDB",
      name: "VNDB",
      id: `https://vndb.org/${producer.id}`
    }
  ]

  return (
    <div className="flex flex-col gap-4 bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">{mainTitle}</h1>
        <h2 className="text-sm text-gray-500">{subTitle}</h2>
      </div>
      <div className="flex flex-col gap-2">
        <Row label="Type" value={type} />
        <Row label="Language" value={lang} />
        {producer.aliases.length > 0 && (
          <Row label="Aliases" value={producer.aliases.join(", ")} />
        )}
        <ExtlinksRow extlinks={extlinks} />
        <DescriptionRow description={producer.description} />
      </div>
    </div>
  )
}
