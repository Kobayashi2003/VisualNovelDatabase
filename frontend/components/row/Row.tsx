interface RowProps {
  label: string
  value: React.ReactNode
}

export function Row({ label, value }: RowProps) {
  if (!value) return null

  return (
    <div className="grid md:grid-cols-[140px_1fr] gap-x-2 gap-y-0.5">
      <h3 className="font-bold text-white/60 text-sm">{label}</h3>
      <div className="flex items-center text-xs md:text-sm">
        {value}
      </div>
    </div>
  )
}
