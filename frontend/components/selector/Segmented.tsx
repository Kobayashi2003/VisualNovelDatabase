/** Capsule segmented control — a row of mutually-exclusive option buttons inside
 *  a pill border. The single source of truth for the tri-state level selectors and
 *  the small label toggles; each caller supplies its options (and an optional
 *  per-option active colour) rather than re-spelling the capsule markup.
 *
 *  Distinct from `button/SwitchButton` (icon switches) and from the kobayashi
 *  page's animated `SegmentedControl` (a deliberately showy, spring-animated
 *  variant kept private to that page). */

import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Abbreviated label shown below the `sm` breakpoint; falls back to `label`. */
  short?: string
  /** Active-state classes for this option; defaults to the neutral `bg-white/20`. */
  activeClass?: string
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}

export function Segmented<T extends string>({ value, onChange, options, className }: SegmentedProps<T>) {
  return (
    <div className={cn("flex items-center rounded-full border border-white/10 overflow-hidden", className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 px-2.5 py-1.5 text-xs font-medium text-center transition-all duration-200",
            value === opt.value
              ? opt.activeClass ?? "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10",
          )}
        >
          {opt.short ? (
            <>
              <span className="sm:hidden">{opt.short}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </>
          ) : (
            opt.label
          )}
        </button>
      ))}
    </div>
  )
}
