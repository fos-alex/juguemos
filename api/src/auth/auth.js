import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { accounts, sessions, users, verifications } from './auth.schema.js'

/** @typedef {import('../config.js').AuthConfig} AuthConfig */
/** @typedef {ReturnType<typeof createAuth>} Auth */

const DAY_SECONDS = 60 * 60 * 24

/** @param {{ config: AuthConfig, db: import('../db/client.js').Db }} deps */
export function createAuth({ config, db }) {
  return betterAuth({
    baseURL: config.url,
    // The phone reaches the stack through Tailscale, at another origin than BETTER_AUTH_URL.
    trustedOrigins: config.trustedOrigins,
    secret: config.secret,
    // Its tables are ours, in auth.schema.js, with plural names like every other table.
    database: drizzleAdapter(db, { provider: 'pg', schema: { users, sessions, accounts, verifications }, usePlural: true }),
    emailAndPassword: { enabled: true },
    socialProviders: config.google ? { google: googleProvider(config.google) } : {},
    account: {
      accountLinking: {
        // Google links to the account with the same email only when Google
        // says the email is verified. Ludi doesn't verify emails yet, so the
        // account it links to can't be required to have a verified one.
        requireLocalEmailVerified: false,
      },
    },
    // Where Google sends the parent back when a sign-in fails before Ludi
    // knows which screen it started from, such as one left open too long.
    onAPIError: { errorURL: '/entrada' },
    // A parent who opens the app once a month stays signed in: the session
    // lasts 30 days and starts over on the first use of each day.
    session: { expiresIn: 30 * DAY_SECONDS, updateAge: DAY_SECONDS },
    databaseHooks: {
      user: {
        create: {
          // No outside testers until the guardrails are complete: only the
          // listed emails, or emails at a listed @domain, can sign up,
          // whatever the sign-in method.
          before: async (user) => {
            const email = user.email.toLowerCase()
            const domain = email.slice(email.lastIndexOf('@'))
            if (!config.signupEmails.has(email) && !config.signupEmails.has(domain)) {
              throw new APIError('FORBIDDEN', { code: 'SIGNUP_NOT_ALLOWED', message: 'Sign-up is by invitation only' })
            }
          },
        },
      },
    },
  })
}

/**
 * Sign in with Google. It asks only for what signing in needs, which is
 * Better Auth's default: the `openid`, `email`, and `profile` scopes, with no
 * offline access. The profile's picture isn't kept.
 * @param {import('../config.js').GoogleConfig} google
 */
function googleProvider({ clientId, clientSecret }) {
  return {
    clientId,
    clientSecret,
    // A shared phone often has more than one Google account on it.
    prompt: /** @type {const} */ ('select_account'),
    mapProfileToUser: () => ({ image: null }),
  }
}
