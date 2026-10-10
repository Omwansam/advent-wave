/**
 * Role and permission vocabulary, for labels only. What a role may do is decided by the gateway
 * (AdminRole, AdminAccessRules) on every request; the app hides what a role cannot use so
 * nobody is offered a button that would only be refused.
 */

export const PERMISSIONS = {
  CATALOG_READ: 'catalog:read',
  MEDIA_WRITE: 'media:write',
  MEDIA_PUBLISH: 'media:publish',
  RIGHTS_WRITE: 'rights:write',
  ADMINS_MANAGE: 'admins:manage',
}

export const PERMISSION_LABEL = {
  'catalog:read': 'See the whole catalogue',
  'media:write': 'Add and edit artists, albums and recordings',
  'media:publish': 'Publish and withdraw recordings',
  'rights:write': 'Manage churches, consent and licences',
  'admins:manage': 'Manage admin accounts',
}

export const ROLES = [
  {
    value: 'super_admin',
    label: 'Super admin',
    description: 'Everything, including admin accounts.',
  },
  {
    value: 'content_manager',
    label: 'Content manager',
    description: 'Adds and edits recordings, artists and albums, and publishes them.',
  },
  {
    value: 'rights_manager',
    label: 'Rights manager',
    description: 'Churches, consent and licences — the rights that gate publication.',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Sees everything, changes nothing.',
  },
]

export function roleLabel(role) {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

/** The gateway's minimum; checked here only to save a round trip. */
export const MIN_PASSWORD_LENGTH = 12

/** A random temporary password for a new account or a reset: 16 characters, no look-alikes. */
export function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint32Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join('')
}
