/**
 * Original-mode display helpers (Pattern A).
 *
 * `showOriginal` comes from SearchContext. Pass it through at the call site.
 *
 * Pattern A semantics:
 *   showOriginal=false → return primary (romanized / default display name)
 *   showOriginal=true  → return original if present, else fall back to primary
 */

/**
 * Core primitive. All Pattern A wrappers delegate here.
 *
 * @param primary   The always-present romanized / default display string.
 * @param original  The original-script string, possibly absent from the payload.
 * @param showOriginal  Toggle from SearchContext.
 */
export function displayField(
  primary: string,
  original: string | null | undefined,
  showOriginal: boolean,
): string {
  if (showOriginal && original != null && original !== "") {
    return original
  }
  return primary
}

/**
 * For entities that use `title` / `alttitle` (VN, Release).
 */
export function displayTitle(
  entity: { title: string; alttitle?: string | null },
  showOriginal: boolean,
): string {
  return displayField(entity.title, entity.alttitle, showOriginal)
}

/**
 * For entities that use `name` / `original` (Producer, Character, Staff).
 */
export function displayName(
  entity: { name: string; original?: string | null },
  showOriginal: boolean,
): string {
  return displayField(entity.name, entity.original, showOriginal)
}
