/** Blank form fields go to the server as null, not as empty strings that would be stored. */
export function blankToNull(value) {
  if (typeof value !== 'string') return value ?? null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/** Applies blankToNull to every string field of a form object. */
export function cleanForm(form) {
  return Object.fromEntries(Object.entries(form).map(([k, v]) => [k, blankToNull(v)]))
}

/** "2026-10-08T…" → "2026-10-08", for date inputs. */
export function toDateInput(iso) {
  return iso ? String(iso).slice(0, 10) : ''
}

/** A URL-safe slug suggestion; the server makes its own when none is sent. */
export function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
