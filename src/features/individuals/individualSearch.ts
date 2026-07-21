// Client-side counterpart to migration 0021's full_name_normalized/alias_normalized
// generated columns — must normalize a search term the exact same way those columns
// normalize full_name/alias (lower, đ->d, strip combining diacritics), so an
// `.ilike()` filter against the normalized columns actually matches.

// Unicode combining diacritical marks (U+0300–U+036F) that NFD normalization splits
// accented Latin letters into — same pattern as src/lib/slug.ts.
const COMBINING_DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

/** Lowercase, Vietnamese-diacritic-insensitive, trimmed form of a search term (FR-004). */
export function normalizeSearchTerm(input: string): string {
  const withoutSpecialD = input.replace(/đ/g, "d").replace(/Đ/g, "D");
  const withoutDiacritics = withoutSpecialD.normalize("NFD").replace(COMBINING_DIACRITICS_PATTERN, "");
  return withoutDiacritics.toLowerCase().trim();
}
