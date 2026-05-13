import { ENUMS } from "@/lib/enums"

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BaseField { value: string; label: string }
export interface TextField extends BaseField { allowEmpty?: boolean; placeholder?: string }
export interface NumberField extends BaseField { integer?: boolean; comparable?: boolean; placeholder?: string }
export interface SelectField extends BaseField { default?: string; comparable?: boolean; options: { value: string; label: string }[] }
export interface DateField extends BaseField { availableFormats: string[]; comparable?: boolean; placeholder?: string }

export interface FilterState {
  text: Record<string, string>
  number: Record<string, string>
  numberComparable: Record<string, { operator: string; number: string }>
  select: Record<string, string>
  selectComparable: Record<string, { operator: string; value: string }>
  date: Record<string, string>
  dateComparable: Record<string, { operator: string; date: string }>
}

// ─── Validation ───────────────────────────────────────────────────────────────
export const OPERATORS = ["=", "<", ">", "<=", ">=", "!="]

const DATE_FORMAT_REGEX: Record<string, RegExp> = {
  "yyyy-mm-dd": /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  "yyyy-mm": /^(19|20)\d{2}-(0[1-9]|1[0-2])$/,
  "yyyy": /^(19|20)\d{2}$/,
  "mm-dd": /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  "mm": /^(0[1-9]|1[0-2])$/,
}

export const isValidNumberInput = (input: string, integer?: boolean): boolean =>
  input === "" ? true : integer ? /^\d+$/.test(input) : /^\d*\.?\d+$/.test(input)

export const isValidDateInput = (input: string): boolean =>
  input === "" ? true : /^[\d-]*$/.test(input)

export const isValidNumber = (input: string, comparable?: boolean, integer?: boolean): boolean => {
  if (!input || input.trim() === "" || input.trim() === "= ") return false
  const r = comparable
    ? (integer ? /^(=|<|>|<=|>=|!=)?\d+$/ : /^(=|<|>|<=|>=|!=)?\d*\.?\d+$/)
    : (integer ? /^\d+$/ : /^\d*\.?\d+$/)
  return r.test(input.replace(/\s/g, ""))
}

export const isValidDate = (input: string, format: string, comparable = false): boolean => {
  if (!input || input.trim() === "" || input.trim() === "= ") return false
  if (comparable) {
    const m = input.replace(/\s/g, "").match(/^(=|<|>|<=|>=|!=)(.*)$/)
    if (!m) return isValidDate(input, format, false)
    return isValidDate(m[2].trim(), format, false)
  }
  const fmt = format.toLowerCase()
  const regex = DATE_FORMAT_REGEX[fmt]
  if (!regex || !regex.test(input)) return false
  const nextYear = new Date().getFullYear() + 1
  if (fmt === "yyyy-mm-dd") {
    const [y, mo, d] = input.split("-").map(Number)
    if (y < 1900 || y > nextYear || mo < 1 || mo > 12) return false
    return d >= 1 && d <= new Date(y, mo, 0).getDate()
  }
  if (fmt === "yyyy-mm") { const [y, mo] = input.split("-").map(Number); return y >= 1900 && y <= nextYear && mo >= 1 && mo <= 12 }
  if (fmt === "yyyy") { const y = Number(input); return y >= 1900 && y <= nextYear }
  if (fmt === "mm-dd") {
    const [mo, d] = input.split("-").map(Number)
    if (mo < 1 || mo > 12) return false
    return d >= 1 && d <= new Date(2000, mo, 0).getDate()
  }
  if (fmt === "mm") { const mo = Number(input); return mo >= 1 && mo <= 12 }
  return false
}

export const isValidSelect = (value: string, comparable = false): boolean => {
  if (comparable) {
    const m = value.match(/^(=|<|>|<=|>=|!=)(.*)$/)
    if (!m) return isValidSelect(value, false)
    return m[2].trim().toLowerCase() !== "any" && m[2].trim() !== ""
  }
  return value.toLowerCase() !== "any" && value !== ""
}

// ─── Filter config ─────────────────────────────────────────────────────────────
export const searchFilters: Record<string, { text?: TextField[]; number?: NumberField[]; select?: SelectField[]; date?: DateField[] }> = {
  v: {
    text: [
      { value: "tag", label: "Tag" },
      { value: "dtag", label: "Directed Tag" },
      { value: "release", label: "Release" },
      { value: "character", label: "Character" },
      { value: "staff", label: "Staff" },
      { value: "developer", label: "Developer" },
    ],
    number: [
      { value: "rating", label: "Rating", integer: true, comparable: true, placeholder: "Bayesian rating 10–100" },
      { value: "votecount", label: "Vote Count", integer: true, comparable: true, placeholder: "Number of votes" },
    ],
    select: [
      { value: "lang", label: "Language", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.LANGUAGE).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "olang", label: "Original Language", default: "ja", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.LANGUAGE).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "platform", label: "Platform", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.PLATFORM).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "length", label: "Length", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.LENGTH).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "devstatus", label: "Dev Status", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.DEVSTATUS).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "has_description", label: "Has Description", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
      { value: "has_anime", label: "Has Anime", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
      { value: "has_screenshot", label: "Has Screenshot", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
      { value: "has_review", label: "Has Review", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
    ],
    date: [{ value: "released", label: "Release Date", availableFormats: ["YYYY-MM-DD", "YYYY-MM", "YYYY"], comparable: true, placeholder: "YYYY-MM-DD / YYYY-MM / YYYY" }],
  },
  r: {
    text: [
      { value: "engine", label: "Engine" },
      { value: "extlink", label: "External Link" },
      { value: "vn", label: "Visual Novel" },
      { value: "producer", label: "Producer" },
    ],
    number: [{ value: "minage", label: "Minimum Age", integer: true, comparable: true, placeholder: "Integer" }],
    select: [
      { value: "lang", label: "Language", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.LANGUAGE).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "platform", label: "Platform", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.PLATFORM).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "medium", label: "Medium", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.MEDIUM).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "voiced", label: "Voiced", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.VOICED).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "rtype", label: "Release Type", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.RTYPE).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "patch", label: "Patch", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
      { value: "freeware", label: "Freeware", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
      { value: "uncensored", label: "Uncensored", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
      { value: "official", label: "Official", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
      { value: "has_ero", label: "Has Ero", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
    ],
    date: [{ value: "released", label: "Release Date", availableFormats: ["YYYY-MM-DD", "YYYY-MM", "YYYY"], comparable: true, placeholder: "YYYY-MM-DD / YYYY-MM / YYYY" }],
  },
  c: {
    text: [
      { value: "trait", label: "Trait" },
      { value: "dtrait", label: "Directed Trait" },
      { value: "seiyuu", label: "Seiyuu" },
      { value: "vn", label: "Visual Novel" },
    ],
    number: [
      { value: "height", label: "Height (cm)", integer: true, comparable: true, placeholder: "Integer" },
      { value: "weight", label: "Weight (kg)", integer: true, comparable: true, placeholder: "Integer" },
      { value: "bust", label: "Bust (cm)", integer: true, comparable: true, placeholder: "Integer" },
      { value: "waist", label: "Waist (cm)", integer: true, comparable: true, placeholder: "Integer" },
      { value: "hips", label: "Hips (cm)", integer: true, comparable: true, placeholder: "Integer" },
      { value: "age", label: "Age", integer: true, comparable: true, placeholder: "Integer" },
    ],
    select: [
      { value: "role", label: "Role", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.CHARACTER_ROLE).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "blood_type", label: "Blood Type", default: "any", options: [{ value: "any", label: "Any" }, { value: "a", label: "A" }, { value: "b", label: "B" }, { value: "ab", label: "AB" }, { value: "o", label: "O" }] },
      { value: "sex", label: "Sex", default: "any", options: [{ value: "any", label: "Any" }, { value: "m", label: "Male" }, { value: "f", label: "Female" }, { value: "b", label: "Both" }, { value: "n", label: "Sexless" }] },
      { value: "sex_spoil", label: "Sex (Spoil)", default: "any", options: [{ value: "any", label: "Any" }, { value: "m", label: "Male" }, { value: "f", label: "Female" }, { value: "b", label: "Both" }, { value: "n", label: "Sexless" }] },
      { value: "cup", label: "Cup Size", default: "any", comparable: true, options: [{ value: "any", label: "Any" }, { value: "AAA", label: "AAA" }, { value: "AA", label: "AA" }, ...Array.from({ length: 26 }, (_, i) => ({ value: String.fromCharCode(65 + i), label: String.fromCharCode(65 + i) }))] },
    ],
    date: [{ value: "birthday", label: "Birthday", availableFormats: ["MM-DD", "MM"], placeholder: "MM-DD or MM" }],
  },
  p: {
    text: [{ value: "extlink", label: "External Link" }],
    select: [
      { value: "lang", label: "Language", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.LANGUAGE).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "type", label: "Type", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.TYPE).map(([k, v]) => ({ value: k, label: v }))] },
    ],
  },
  s: {
    text: [{ value: "extlink", label: "External Link" }],
    select: [
      { value: "lang", label: "Language", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.LANGUAGE).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "gender", label: "Gender", default: "any", options: [{ value: "any", label: "Any" }, { value: "m", label: "Male" }, { value: "f", label: "Female" }] },
      { value: "role", label: "Role", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.STAFF_ROLE).map(([k, v]) => ({ value: k, label: v }))] },
      { value: "ismain", label: "Is Main", default: "any", options: [{ value: "any", label: "Any" }, { value: "1", label: "Yes" }, { value: "0", label: "No" }] },
    ],
  },
  g: {
    select: [
      { value: "category", label: "Category", default: "any", options: [{ value: "any", label: "Any" }, ...Object.entries(ENUMS.CATEGORY).map(([k, v]) => ({ value: k, label: v }))] },
    ],
  },
  i: {},
}

// ─── State helpers ─────────────────────────────────────────────────────────────
export function buildInitialState(type: string): FilterState {
  const f = searchFilters[type] || {}
  return {
    text: Object.fromEntries((f.text || []).map(x => [x.value, ""])),
    number: Object.fromEntries((f.number || []).filter(x => !x.comparable).map(x => [x.value, ""])),
    numberComparable: Object.fromEntries((f.number || []).filter(x => x.comparable).map(x => [x.value, { operator: "=", number: "" }])),
    select: Object.fromEntries((f.select || []).filter(x => !x.comparable).map(x => [x.value, x.default || "any"])),
    selectComparable: Object.fromEntries((f.select || []).filter(x => x.comparable).map(x => [x.value, { operator: "=", value: "any" }])),
    date: Object.fromEntries((f.date || []).filter(x => !x.comparable).map(x => [x.value, ""])),
    dateComparable: Object.fromEntries((f.date || []).filter(x => x.comparable).map(x => [x.value, { operator: "=", date: "" }])),
  }
}

export function buildFilterParams(type: string, state: FilterState): Record<string, string> {
  const f = searchFilters[type] || {}
  const result: Record<string, string> = {}

  for (const [k, v] of Object.entries(state.text)) {
    if (v.trim()) result[k] = v.trim()
  }
  for (const [k, v] of Object.entries(state.number)) {
    const field = f.number?.find(x => x.value === k)
    if (field && isValidNumber(v, false, field.integer)) result[k] = v.trim()
  }
  for (const [k, v] of Object.entries(state.numberComparable)) {
    const field = f.number?.find(x => x.value === k)
    const combined = `${v.operator} ${v.number}`.trim()
    if (field && isValidNumber(combined, true, field.integer)) result[k] = combined
  }
  for (const [k, v] of Object.entries(state.select)) {
    if (isValidSelect(v, false)) result[k] = v
  }
  for (const [k, v] of Object.entries(state.selectComparable)) {
    const combined = `${v.operator} ${v.value}`.trim()
    if (isValidSelect(combined, true)) result[k] = combined
  }
  for (const [k, v] of Object.entries(state.date)) {
    const field = f.date?.find(x => x.value === k)
    if (field && field.availableFormats.some(fmt => isValidDate(v, fmt, false))) result[k] = v.trim()
  }
  for (const [k, v] of Object.entries(state.dateComparable)) {
    const combined = `${v.operator} ${v.date}`.trim()
    const field = f.date?.find(x => x.value === k)
    if (field && field.availableFormats.some(fmt => isValidDate(combined, fmt, true))) result[k] = combined
  }

  return result
}
