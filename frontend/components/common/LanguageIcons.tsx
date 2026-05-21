/** Unified language display: flag icon(s) with a tooltip carrying the language
 *  name. Used by every detail-page info panel (VN / Producer / Release / Staff)
 *  so a "Language(s)" field looks identical everywhere. */
"use client"

import { cn } from "@/lib/utils"
import { ICON } from "@/lib/icons"
import { enumLabel } from "@/lib/enums"
import { Tooltip } from "./Tooltip"

const LANG_ICON = ICON.LANGUAGE as Record<string, string>

/** A language entry — either a bare code, or a code with release-style flags. */
export type LangEntry = string | { lang: string; main?: boolean; mtl?: boolean }

interface LanguageIconsProps {
  langs: LangEntry[]
  /** Original language — highlighted with an accent ring when matched. */
  olang?: string
  className?: string
}

export function LanguageIcons({ langs, olang, className }: LanguageIconsProps) {
  if (langs.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {langs.map((entry, i) => {
        const code = typeof entry === "string" ? entry : entry.lang
        const main = typeof entry === "string" ? false : !!entry.main
        const mtl = typeof entry === "string" ? false : !!entry.mtl
        const isOlang = olang != null && code === olang
        const iconClass = LANG_ICON[code]

        const label = [
          enumLabel("LANGUAGE", code),
          isOlang ? "(original)" : main ? "(main)" : null,
          mtl ? "[machine translation]" : null,
        ].filter(Boolean).join(" ")

        return (
          <Tooltip key={`${code}-${i}`} label={label}>
            {iconClass ? (
              <span
                className={cn(
                  iconClass,
                  mtl && "opacity-40",
                  isOlang && "ring-1 ring-accent rounded-xs",
                )}
              />
            ) : (
              <span className="text-xs text-muted">{code}</span>
            )}
          </Tooltip>
        )
      })}
    </div>
  )
}
