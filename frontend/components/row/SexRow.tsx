import { Row } from "@/components/row/Row"

const SEX_LABELS: Record<string, string> = {
  m: "Male",
  f: "Female",
  b: "Both",
  n: "Sexless",
}

interface SexRowProps {
  sex?: [string, string]
  spoilerLevel: number
}

export function SexRow({ sex, spoilerLevel }: SexRowProps) {
  if (!sex) return null

  const [apparent, spoiler] = sex
  const apparentLabel = SEX_LABELS[apparent] || apparent
  const spoilerLabel = SEX_LABELS[spoiler] || spoiler

  if (spoilerLevel >= 1 && spoiler && spoiler !== apparent) {
    return <Row label="Sex" value={`${spoilerLabel} (apparent: ${apparentLabel})`} />
  }

  return <Row label="Sex" value={apparentLabel} />
}
