/** Toggle for how the VN page renders characters — thumbnail grid or one-card slider. */

import type { VNCharacterLayout } from "@/lib/types"
import { Segmented, type SegmentedOption } from "./Segmented"

const LAYOUTS: SegmentedOption<VNCharacterLayout>[] = [
  { value: "grid", label: "Grid" },
  { value: "slider", label: "Slides" },
]

interface CharacterLayoutSelectorProps {
  layout: VNCharacterLayout
  setLayout: (layout: VNCharacterLayout) => void
  className?: string
}

export function CharacterLayoutSelector({ layout, setLayout, className }: CharacterLayoutSelectorProps) {
  return <Segmented value={layout} onChange={setLayout} options={LAYOUTS} className={className} />
}
