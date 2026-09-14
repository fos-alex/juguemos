import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { authSchema } from './schema.js'

/** @typedef {import('../config.js').AuthConfig} AuthConfig */
/** @typedef {ReturnType<typeof createAuth>} Auth */

/** @param {{ config: AuthConfig, db: import('pg').Pool }} deps */
export function createAuth({ config, db }) {
  return betterAuth({
    baseURL: config.url,
    secret: config.secret,
    database: db,
    emailAndPassword: { enabled: true },
    ...authSchema,
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
