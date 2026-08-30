/**
 * Prefilled credentials for the login form. The gateway's development session endpoint
 * accepts any email and checks no password, so this is a convenience, not a credential —
 * it disappears when the managed IdP lands (plan §1 pre-work).
 */
export const DEMO_LOGIN = {
  email: 'listener@adventwave.app',
  password: 'demo1234',
}
