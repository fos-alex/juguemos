/**
 * The shapes the account screens work with. The API module translates to and
 * from the API's own shapes, so screens never see them.
 */

/**
 * @typedef {{ name: string, email: string, provider: 'email' | 'google', emailVerified: boolean, familyFromText?: boolean }} Account
 * `familyFromText` says the API can read a family from the parent's own words (an LLM is set up),
 * so first run starts at /familia/contanos instead of the form.
 */

export {}
