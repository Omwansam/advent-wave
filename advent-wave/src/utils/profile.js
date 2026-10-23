/**
 * How a profile is named on a card and in a page header (RFC 0009). Every artist has a `kind`;
 * a choir also has an `ensemble`; a church's choirs, groups and preachers carry `churchName`.
 */

const ENSEMBLE_LABEL = {
  main: 'Choir',
  youth: 'Youth choir',
  children: 'Children’s choir',
  women: 'Women’s choir',
  men: 'Men’s choir',
  other: 'Choir',
}

const KIND_LABEL = {
  church: 'Church',
  choir: 'Choir',
  group: 'Group',
  soloist: 'Singer',
  preacher: 'Preacher',
  ministry: 'Ministry',
}

/** "Youth choir", "Church", "Preacher". */
export function kindLabel(profile) {
  if (!profile?.kind) return 'Artist'
  if (profile.kind === 'choir') return ENSEMBLE_LABEL[profile.ensemble] ?? 'Choir'
  return KIND_LABEL[profile.kind] ?? 'Artist'
}

/** Choirs, groups and singers belong to a church or stand on their own. */
const MUSICAL = new Set(['choir', 'group', 'soloist'])

/** A card's second line: "Youth choir · Nairobi Central SDA", "Independent choir", "Church · Kisumu". */
export function profileSubtitle(profile) {
  const label = kindLabel(profile)
  if (profile?.churchName) return `${label} · ${profile.churchName}`
  if (MUSICAL.has(profile?.kind)) return `Independent ${label.toLowerCase()}`
  if (profile?.location) return `${label} · ${profile.location}`
  return label
}

/** The chips on the Choirs & churches page, and the query each one asks for. */
export const PROFILE_FILTERS = [
  { id: 'all', label: 'All', query: {} },
  { id: 'churches', label: 'Churches', query: { kind: 'church' } },
  { id: 'choirs', label: 'Choirs', query: { kind: 'choir', ensemble: 'main' } },
  { id: 'youth', label: 'Youth choirs', query: { kind: 'choir', ensemble: 'youth' } },
  { id: 'children', label: 'Children’s choirs', query: { kind: 'choir', ensemble: 'children' } },
  { id: 'groups', label: 'Groups & singers', query: { kind: ['group', 'soloist'] } },
  { id: 'independent', label: 'Independent', query: { independent: true } },
  { id: 'preachers', label: 'Preachers', query: { kind: 'preacher' } },
  { id: 'ministries', label: 'Ministries', query: { kind: 'ministry' } },
]
