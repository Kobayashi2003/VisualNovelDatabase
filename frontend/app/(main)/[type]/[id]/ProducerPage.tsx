import { Producer } from "@/lib/types"

import { ProducerDetailsPanel } from "@/components/panel/ProducerDetailsPanel"
import { RelatedVNsPanel } from "@/components/panel/RelatedVNsPanel"

interface ProducerPageProps {
  producer: Producer
}

export default function ProducerPage({ producer }: ProducerPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <ProducerDetailsPanel producer={producer} />
      <RelatedVNsPanel
        title="Visual Novels"
        searchParams={{ developer_id: producer.id }}
      />
    </div>
  )
}