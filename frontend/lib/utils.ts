/** Miscellaneous small helpers shared across the UI. */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


/* ─── Class-name composition ───────────────────────────────────────────────── */

// Merge Tailwind class lists while resolving conflicts (later utilities win).
// Standard convenience wrapper used by every component for `className` props.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/* ─── Formatters ───────────────────────────────────────────────────────────── */

// Render an ISO date as a coarse "X days/months/years ago" string.
// Used for "created/updated" labels where exact timestamps are not useful.
export function formatRelativeDate(isoDate: string): string {
  const d = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`
  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`
}

// Render a VNDB birthday pair `[month, day]` as e.g. "29 May".
// Used by the character info panel and the dense VN character cards.
const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
export function formatBirthday(birthday: [number, number] | null | undefined): string | null {
  if (!birthday) return null
  return `${birthday[1]} ${MONTH_NAMES[birthday[0]] ?? birthday[0]}`
}

// Format playtime in minutes as "XhYm" / "Xh" / "Ym", skipping zero
// components so we never render "0h45m" or "2h0m".
export function formatPlaytime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours && minutes) return `${hours}h${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}


/* ─── Content-rating helpers ───────────────────────────────────────────────── */

/**
 * Decide whether an image should be blurred for the active content level.
 *
 * `sexual` / `violence` are VNDB content scores (0–2). The user's chosen
 * tolerance is one of `safe | suggestive | explicit` for sexual content and
 * `tame | violent | brutal` for violence. We blur only when the score exceeds
 * what the user has opted to see.
 */
export function shouldBlur(
  sexual: number, violence: number,
  sexualLevel: string, violenceLevel: string,
): boolean {
  const isSexual = (sexualLevel === "safe" && sexual > 0.5) || (sexualLevel === "suggestive" && sexual > 1.5)
  const isViolent = (violenceLevel === "tame" && violence > 0.5) || (violenceLevel === "violent" && violence > 1.5)
  return isSexual || isViolent
}
