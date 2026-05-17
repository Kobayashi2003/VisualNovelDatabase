import { SwitchButton } from "@/components/button/SwitchButton"
import { ImageIcon, TextIcon } from "lucide-react"

interface CardTypeSwitchProps {
  cardType: "image" | "text"
  setCardType: (cardType: "image" | "text") => void
  disabled?: boolean
  className?: string
}

export function CardTypeSwitch({ cardType, setCardType, disabled, className }: CardTypeSwitchProps) {
  const options = [
    { value: "image", icon: <ImageIcon className="w-4 h-4" />, tooltip: "Image cards" },
    { value: "text", icon: <TextIcon className="w-4 h-4" />, tooltip: "Text cards" },
  ]

  return (
    <SwitchButton
      options={options}
      selected={cardType}
      onSelect={(v) => setCardType(v as "image" | "text")}
      disabled={disabled}
      className={className}
    />
  )
}
