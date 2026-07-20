// Family tree slug generation/validation — see
// specs/002-lunar-events-tree-slugs/contracts/tree-slug-routing.md and research.md §3.
// Uniqueness (including the collision-suffix retry) is NOT this module's job — it's
// enforced by the database `UNIQUE` constraint (supabase/migrations/0013_family_tree_slug.sql);
// this is a convenience/UX layer only.

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Unicode combining diacritical marks (U+0300–U+036F) that NFD normalization splits
// accented Latin letters into — e.g. "ệ" -> "e" + U+0323 + U+0302.
const COMBINING_DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

/**
 * NFD-normalizes `name`, maps Vietnamese `đ`/`Đ` → `d`/`D` (not handled by NFD alone,
 * since `đ` is a distinct Latin letter, not a combining-mark accented vowel), strips
 * remaining diacritics, lowercases, collapses runs of non-`[a-z0-9]` characters into a
 * single `-`, and trims leading/trailing `-`.
 */
export function slugify(name: string): string {
  const withoutSpecialD = name.replace(/đ/g, "d").replace(/Đ/g, "D");
  const withoutDiacritics = withoutSpecialD.normalize("NFD").replace(COMBINING_DIACRITICS_PATTERN, "");
  const collapsed = withoutDiacritics.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return collapsed.replace(/^-+/, "").replace(/-+$/, "");
}

/** `true` only for a non-empty, already-lowercase, hyphen-separated slug. */
export function isValidSlug(candidate: string): boolean {
  return SLUG_PATTERN.test(candidate);
}
