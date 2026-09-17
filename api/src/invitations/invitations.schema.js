/**
 * Invitations to join Ludi (JUG-34). Alex invites an email from the admin, and
 * the link sent to it lets that email create an account.
 */
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { createdAt, timestamptz } from '../db/columns.js'

export const invitations = pgTable('invitations', {
  id: uuid().primaryKey().defaultRandom(),
  // Lowercased, as Better Auth keeps a user's email. One invitation per email:
  // inviting it again gives it a new token and a new expiry.
  email: text().notNull().unique(),
  // The SHA-256 of the token in the link. The token itself is only in the email.
  tokenHash: text().notNull().unique('invitations_token_hash_unique'),
  sentAt: timestamptz().notNull(),
  expiresAt: timestamptz().notNull(),
  // When an account was created for the email, by any sign-up.
  acceptedAt: timestamptz(),
  createdAt: createdAt(),
})
