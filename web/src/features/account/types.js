/**
 * The shapes the account screens work with. The API module translates to and
 * from the API's own shapes, so screens never see them.
 */

/**
 * @typedef {{ name: string, email: string, emailVerified: boolean, familyFromText?: boolean }} Account
 * `familyFromText` says the API can read a family from the parent's own words (an LLM is set up),
 * so first run starts at /familia/contanos instead of the form.
 */

/** @typedef {{ token: string, email: string }} InvitationLink The token and the email an invitation's link carries (JUG-34). */

/**
 * @typedef {{ next: 'signUp' | 'signIn', email: string } | { next: 'expired' | 'invalid' }} Invitation
 * Where an invitation's link leads: creating the account, signing in because the email has one, or nowhere.
 */

export {}
