"use client"

import { cn } from "@/lib/utils"
import {
  FilterState, TextField, NumberField, SelectField, DateField,
  OPERATORS, searchFilters,
  isValidNumberInput, isValidDateInput, isValidDate,
} from "@/lib/filterConfig"

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder:text-muted focus:outline-none focus:border-white/30"
const selectCls = "px-3 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"

// ─── Field label ──────────────────────────────────────────────────────────────
function FieldLabel({ label }: { label: string }) {
  return <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{label}</p>
}

// ─── Field components ─────────────────────────────────────────────────────────
function TextFilter({ filter, value, onChange }: { filter: TextField; value: string; onChange: (k: string, v: string) => void }) {
  return (
    <div>
      <FieldLabel label={filter.label} />
      <input className={inputCls} value={value} onChange={e => onChange(filter.value, e.target.value)} placeholder={filter.placeholder} />
    </div>
  )
}

function NumberFilter({ filter, value, onChange }: { filter: NumberField; value: string; onChange: (k: string, v: string) => void }) {
  return (
    <div>
      <FieldLabel label={filter.label} />
      <input className={inputCls} value={value}
        onChange={e => { if (isValidNumberInput(e.target.value, filter.integer)) onChange(filter.value, e.target.value) }}
        placeholder={filter.placeholder} />
    </div>
  )
}

function NumberFilterComparable({ filter, value, onChange }: {
  filter: NumberField
  value: { operator: string; number: string }
  onChange: (k: string, v: { operator: string; number: string }) => void
}) {
  return (
    <div>
      <FieldLabel label={filter.label} />
      <div className="flex gap-2">
        <select className={cn(selectCls, "w-20 shrink-0")} value={value.operator}
          onChange={e => onChange(filter.value, { operator: e.target.value, number: value.number })}>
          {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        <input className={cn(inputCls, "flex-1")} value={value.number}
          onChange={e => { if (isValidNumberInput(e.target.value, filter.integer)) onChange(filter.value, { operator: value.operator, number: e.target.value }) }}
          placeholder={filter.placeholder} />
      </div>
    </div>
  )
}

function SelectFilter({ filter, value, onChange }: { filter: SelectField; value: string; onChange: (k: string, v: string) => void }) {
  return (
    <div>
      <FieldLabel label={filter.label} />
      <select className={cn(selectCls, "w-full")} value={value} onChange={e => onChange(filter.value, e.target.value)}>
        {filter.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function SelectFilterComparable({ filter, value, onChange }: {
  filter: SelectField
  value: { operator: string; value: string }
  onChange: (k: string, v: { operator: string; value: string }) => void
}) {
  return (
    <div>
      <FieldLabel label={filter.label} />
      <div className="flex gap-2">
        <select className={cn(selectCls, "w-20 shrink-0")} value={value.operator}
          onChange={e => onChange(filter.value, { operator: e.target.value, value: value.value })}>
          {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        <select className={cn(selectCls, "flex-1")} value={value.value}
          onChange={e => onChange(filter.value, { operator: value.operator, value: e.target.value })}>
          {filter.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )
}

function DateFilter({ filter, value, onChange }: { filter: DateField; value: string; onChange: (k: string, v: string) => void }) {
  const valid = value === "" || filter.availableFormats.some(f => isValidDate(value, f, false))
  return (
    <div>
      <FieldLabel label={filter.label} />
      <input className={cn(inputCls, !valid && "border-red-500 bg-red-500/10")}
        value={value} onChange={e => { if (isValidDateInput(e.target.value)) onChange(filter.value, e.target.value) }}
        placeholder={filter.placeholder} />
    </div>
  )
}

function DateFilterComparable({ filter, value, onChange }: {
  filter: DateField
  value: { operator: string; date: string }
  onChange: (k: string, v: { operator: string; date: string }) => void
}) {
  const valid = value.date === "" || filter.availableFormats.some(f => isValidDate(value.date, f, true))
  return (
    <div>
      <FieldLabel label={filter.label} />
      <div className="flex gap-2">
        <select className={cn(selectCls, "w-20 shrink-0")} value={value.operator}
          onChange={e => onChange(filter.value, { operator: e.target.value, date: value.date })}>
          {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        <input className={cn(inputCls, "flex-1", !valid && "border-red-500 bg-red-500/10")}
          value={value.date} onChange={e => { if (isValidDateInput(e.target.value)) onChange(filter.value, { operator: value.operator, date: e.target.value }) }}
          placeholder={filter.placeholder} />
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface FiltersFormProps {
  type: string
  filterState: FilterState
  setFilterState: (s: FilterState) => void
}

export function FiltersForm({ type, filterState, setFilterState }: FiltersFormProps) {
  const f = searchFilters[type] || {}

  const setText = (k: string, v: string) => setFilterState({ ...filterState, text: { ...filterState.text, [k]: v } })
  const setNumber = (k: string, v: string) => setFilterState({ ...filterState, number: { ...filterState.number, [k]: v } })
  const setNumberComparable = (k: string, v: { operator: string; number: string }) =>
    setFilterState({ ...filterState, numberComparable: { ...filterState.numberComparable, [k]: v } })
  const setSelect = (k: string, v: string) => setFilterState({ ...filterState, select: { ...filterState.select, [k]: v } })
  const setSelectComparable = (k: string, v: { operator: string; value: string }) =>
    setFilterState({ ...filterState, selectComparable: { ...filterState.selectComparable, [k]: v } })
  const setDate = (k: string, v: string) => setFilterState({ ...filterState, date: { ...filterState.date, [k]: v } })
  const setDateComparable = (k: string, v: { operator: string; date: string }) =>
    setFilterState({ ...filterState, dateComparable: { ...filterState.dateComparable, [k]: v } })

  const hasAny = f.text?.length || f.number?.length || f.select?.length || f.date?.length

  return (
    <div className="flex flex-col gap-4">
      {f.text?.map(field => (
        <TextFilter key={field.value} filter={field}
          value={filterState.text[field.value] ?? ""}
          onChange={setText} />
      ))}
      {f.number?.map(field => field.comparable ? (
        <NumberFilterComparable key={field.value} filter={field}
          value={filterState.numberComparable[field.value] ?? { operator: "=", number: "" }}
          onChange={setNumberComparable} />
      ) : (
        <NumberFilter key={field.value} filter={field}
          value={filterState.number[field.value] ?? ""}
          onChange={setNumber} />
      ))}
      {f.select?.map(field => field.comparable ? (
        <SelectFilterComparable key={field.value} filter={field}
          value={filterState.selectComparable[field.value] ?? { operator: "=", value: "any" }}
          onChange={setSelectComparable} />
      ) : (
        <SelectFilter key={field.value} filter={field}
          value={filterState.select[field.value] ?? field.default ?? "any"}
          onChange={setSelect} />
      ))}
      {f.date?.map(field => field.comparable ? (
        <DateFilterComparable key={field.value} filter={field}
          value={filterState.dateComparable[field.value] ?? { operator: "=", date: "" }}
          onChange={setDateComparable} />
      ) : (
        <DateFilter key={field.value} filter={field}
          value={filterState.date[field.value] ?? ""}
          onChange={setDate} />
      ))}
      {!hasAny && (
        <p className="text-sm text-muted text-center py-4">No filters available for this type.</p>
      )}
    </div>
  )
}
