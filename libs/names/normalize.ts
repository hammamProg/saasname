/** The single definition of "the same name" across the product.
 *
 *  Candidate de-duplication, Phase 3's platform_cache keys, and probe queries
 *  must all agree, so this lives in one place and is imported everywhere
 *  rather than reimplemented per call site.
 *
 *  Lowercases, strips diacritics to their base letters, and removes everything
 *  that is not a letter or digit. Returns "" when nothing normalizable remains,
 *  which callers must treat as an invalid name. */
export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD") // split "é" into "e" + combining accent
    .replace(/[\u0300-\u036f]/g, "") // drop the combining accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
