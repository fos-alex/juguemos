import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { authSchema } from './schema.js'

/** @typedef {import('../config.js').AuthConfig} AuthConfig */
/** @typedef {ReturnType<typeof createAuth>} Auth */

const DAY_SECONDS = 60 * 60 * 24

/** @param {{ config: AuthConfig, db: import('pg').Pool }} deps */
export function createAuth({ config, db }) {
  return betterAuth({
    baseURL: config.url,
    secret: config.secret,
    database: db,
    emailAndPassword: { enabled: true },
    ...authSchema,
    // A parent who opens the app once a month stays signed in: the session
    // lasts 30 days and starts over on the first use of each day.
    session: { ...authSchema.session, expiresIn: 30 * DAY_SECONDS, updateAge: DAY_SECONDS },
    databaseHooks: {
      user: {
        create: {
          // No outside testers until the guardrails are complete: only the
          // listed emails can sign up, whatever the sign-in method.
          before: async (user) => {
            if (!config.signupEmails.has(user.email.toLowerCase())) {
              throw new APIError('FORBIDDEN', { code: 'SIGNUP_NOT_ALLOWED', message: 'Sign-up is by invitation only' })
            }
          },
        },
      },
    },
  })
}
