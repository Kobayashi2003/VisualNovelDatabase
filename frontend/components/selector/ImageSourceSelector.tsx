/** Toggle for where VNDB images load from — the imgserve proxy or VNDB directly. */

import type { ImageSource } from "@/lib/types"
import { Segmented, type SegmentedOption } from "./Segmented"

const SOURCES: SegmentedOption<ImageSource>[] = [
  { value: "imgserve", label: "Proxy" },
  { value: "direct", label: "Direct" },
]

interface ImageSourceSelectorProps {
  imageSource: ImageSource
  setImageSource: (source: ImageSource) => void
  className?: string
}

export function ImageSourceSelector({ imageSource, setImageSource, className }: ImageSourceSelectorProps) {
  return <Segmented value={imageSource} onChange={setImageSource} options={SOURCES} className={className} />
}
