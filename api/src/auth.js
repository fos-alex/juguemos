import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { pool } from './db.js'
import { createFamily } from './families.js'

export const baseURL = process.env.BETTER_AUTH_URL ?? 'https://juguemos.local:3000'

// No outside testers until the guardrails are complete: only these emails can
// sign up. Empty means nobody can.
const signupEmails = new Set(
  (process.env.SIGNUP_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  emailAndPassword: { enabled: true },
  user: { modelName: 'users' },
  session: { modelName: 'sessions' },
  account: { modelName: 'accounts' },
  verification: { modelName: 'verifications' },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!signupEmails.has(user.email.toLowerCase())) {
            throw new APIError('FORBIDDEN', { code: 'SIGNUP_NOT_ALLOWED', message: 'Sign-up is by invitation only' })
          }
        },
        after: async (user) => {
          await createFamily(user.id)
        },
      },
    },
  },
})
