"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import {
  FilterState, TextField, NumberField, SelectField, DateField,
  OPERATORS, searchFilters,
  isValidNumberInput, isValidDateInput, isValidDate,
} from "@/lib/config"

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder:text-muted focus:outline-none focus:border-white/30"
const selectCls = "appearance-none pl-3 pr-8 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 cursor-pointer"

// Wrapper that adds the custom chevron icon
function SelectWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
    </div>
  )
}

// Segmented operator button group — replaces the operator <select> dropdown
function OperatorButtons({ value, onChange }: { value: string; onChange: (op: string) => void }) {
  return (
    <div className="flex rounded-lg border border-white/10 overflow-hidden">
      {OPERATORS.map(op => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(op)}
          className={cn(
            "flex-1 py-1.5 text-xs font-mono transition-colors leading-none",
            value === op
              ? "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          {op}
        </button>
      ))}
    </div>
  )
}

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
      <div className="flex flex-col gap-1.5">
        <OperatorButtons value={value.operator} onChange={op => onChange(filter.value, { operator: op, number: value.number })} />
        <input className={inputCls} value={value.number}
          onChange={e => { if (isValidNumberInput(e.target.value, filter.integer)) onChange(filter.value, { operator: value.operator, number: e.target.value }) }}
          placeholder={filter.placeholder} />
      </div>
    </div>
  )
}

function SelectFilter({ filter, value, onChange }: { filter: SelectField; value: string; onChange: (k: string, v: string) => void }) {
  // Use segmented toggle buttons only when options are few AND all labels are short enough to fit
  const useToggle = filter.options.length <= 3 ||
    (filter.options.length <= 5 && filter.options.every(o => o.label.length <= 3))
  if (useToggle) {
    return (
      <div>
        <FieldLabel label={filter.label} />
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {filter.options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(filter.value, o.value)}
              className={cn(
                "flex-1 py-1.5 text-xs transition-colors leading-none",
                value === o.value
                  ? "bg-white/20 text-white font-medium"
                  : "text-muted hover:text-white hover:bg-white/10"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div>
      <FieldLabel label={filter.label} />
      <SelectWrap className="w-full">
        <select className={cn(selectCls, "w-full")} value={value} onChange={e => onChange(filter.value, e.target.value)}>
          {filter.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </SelectWrap>
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
      <div className="flex flex-col gap-1.5">
        <OperatorButtons value={value.operator} onChange={op => onChange(filter.value, { operator: op, value: value.value })} />
        <SelectWrap className="w-full">
          <select className={cn(selectCls, "w-full")} value={value.value}
            onChange={e => onChange(filter.value, { operator: value.operator, value: e.target.value })}>
            {filter.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SelectWrap>
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
      <div className="flex flex-col gap-1.5">
        <OperatorButtons value={value.operator} onChange={op => onChange(filter.value, { operator: op, date: value.date })} />
        <input className={cn(inputCls, !valid && "border-red-500 bg-red-500/10")}
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
      {f.select?.some(field => !field.comparable) && (
        <div className="grid grid-cols-2 gap-3">
          {f.select!.filter(field => !field.comparable).map(field => (
            <SelectFilter key={field.value} filter={field}
              value={filterState.select[field.value] ?? field.default ?? "any"}
              onChange={setSelect} />
          ))}
        </div>
      )}
      {f.select?.filter(field => field.comparable).map(field => (
        <SelectFilterComparable key={field.value} filter={field}
          value={filterState.selectComparable[field.value] ?? { operator: "=", value: "any" }}
          onChange={setSelectComparable} />
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
