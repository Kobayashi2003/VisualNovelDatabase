import { Producer } from "@/lib/types"

import { ProducerDetailsPanel } from "@/components/panel/ProducerDetailsPanel"

interface ProducerPageProps {
  producer: Producer
}

export default function ProducerPage({ producer }: ProducerPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <ProducerDetailsPanel producer={producer} />
    </div>
  )
}