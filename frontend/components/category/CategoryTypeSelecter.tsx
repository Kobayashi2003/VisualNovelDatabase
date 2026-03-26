import { TypeSelector2 } from "@/components/selector/TypeSelector2"

interface TypeOption {
  key: string
  value: string
  label: string
}

interface CategoryTypeSelecterProps {
  typeOptions: TypeOption[]
  selectedValue: string
  onChange: (value: string) => void
  className?: string
}

export function CategoryTypeSelecter({ typeOptions, selectedValue, onChange, className }: CategoryTypeSelecterProps) {

  return (
    <TypeSelector2
      selected={selectedValue}
      onSelect={onChange}
      className={className}
    />
  )
}