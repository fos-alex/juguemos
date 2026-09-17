/**
 * Invitations to join Ludi (JUG-34). Alex invites an email from the admin, and
 * the email gets a link with a token. With that token the email can sign up,
 * by password or with Google, whether or not SIGNUP_EMAILS lists it.
 *
 * An invitation holds an address, and its token lets someone create an
 * account, so neither is logged or put in an error message.
 */
import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { users } from '../auth/auth.schema.js'
import { ConflictError, NotFoundError, UnavailableError } from '../errors.js'
import { invitationEmail } from './invitation-email.js'
import { invitations } from './invitations.schema.js'

/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../email/mailer.js').Mailer} Mailer */
/** @typedef {ReturnType<typeof createInvitationsService>} InvitationsService */
/** @typedef {typeof invitations.$inferSelect} InvitationRow */

/**
 * An invitation as the admin sees it, without its token.
 * @typedef {object} Invitation
 * @property {string} id
 * @property {string} email
 * @property {'pending' | 'expired' | 'accepted'} status
 * @property {Date} sentAt
 * @property {Date} expiresAt
 */

/**
 * An account as the admin sees it.
 * @typedef {{ id: string, name: string, email: string, createdAt: Date }} Account
 */

/**
 * What an invitation's token says about a sign-up: `admitted` when it is open
 * and for this email, `other-email` when it is open and for another one.
 * @typedef {'admitted' | 'other-email'} Admission
 */

/** How many days an invitation's link works. */
export const INVITATION_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

/** The screen the link opens. */
const LANDING_PATH = '/invitacion'

/** @param {string} token */
const hashOf = (token) => createHash('sha256').update(token).digest('hex')

/** Emails compare as Better Auth keeps them: lowercased. @param {string} email */
const normalized = (email) => email.trim().toLowerCase()

/**
 * @param {{ db: Db, mailer: Mailer | null, appUrl: string, now?: () => Date }} deps
 *   `appUrl` is the public origin the link points to; without a mailer nobody can be invited
 */
export function createInvitationsService({ db, mailer, appUrl, now = () => new Date() }) {
  /** @param {string} email */
  async function registered(email) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    return Boolean(user)
  }

  /** @param {string} token @returns {Promise<InvitationRow | undefined>} */
  async function byToken(token) {
    const [row] = await db.select().from(invitations).where(eq(invitations.tokenHash, hashOf(token))).limit(1)
    return row
  }

  /** @param {InvitationRow} row @returns {Invitation} */
  function summary({ id, email, sentAt, expiresAt, acceptedAt }) {
    const status = acceptedAt ? 'accepted' : expiresAt <= now() ? 'expired' : 'pending'
    return { id, email, status, sentAt, expiresAt }
  }

  /** The link in the email: the landing screen, with the token and the email. @param {string} token @param {string} email */
  function linkFor(token, email) {
    const url = new URL(LANDING_PATH, appUrl)
    url.searchParams.set('token', token)
    url.searchParams.set('email', email)
    return url.href
  }

  return {
    /** Every invitation, the latest sent first. @returns {Promise<Invitation[]>} */
    async list() {
      const rows = await db.select().from(invitations).orderBy(desc(invitations.sentAt))
      return rows.map(summary)
    },

    /** Every account, the newest first. @returns {Promise<Account[]>} */
    async accounts() {
      return db
        .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
        .from(users)
        .orderBy(desc(users.createdAt))
    },

    /**
     * Invites an email and sends it the link. Inviting it again gives it a new
     * token, so the link sent before stops working.
     * @param {string} address
     * @returns {Promise<Invitation>}
     */
    async invite(address) {
      if (!mailer) throw new UnavailableError('Email is off, so nobody can be invited: set SMTP_HOST', 'EMAIL_OFF')
      const email = normalized(address)
      if (await registered(email)) throw new ConflictError('That email already has an account', 'ALREADY_REGISTERED')

      const token = randomBytes(32).toString('base64url')
      const sentAt = now()
      const expiresAt = new Date(sentAt.getTime() + INVITATION_DAYS * DAY_MS)
      const values = { tokenHash: hashOf(token), sentAt, expiresAt, acceptedAt: null }
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(invitations)
          .values({ email, ...values })
          .onConflictDoUpdate({ target: invitations.email, set: values })
          .returning()
        // Sent before the transaction commits: when the email fails, the
        // invitation stays as it was, and the link sent before still works.
        await mailer.send(invitationEmail({ to: email, link: linkFor(token, email), expiresAt }))
        return summary(row)
      })
    },

    /**
     * What the landing screen needs to know about a link: the email, and
     * whether it already has an account, in which case the link goes to sign
     * in even once it has expired.
     * @param {{ token: string, email: string }} link
     * @returns {Promise<{ email: string, registered: boolean }>}
     */
    async check({ token, email }) {
      const invitation = await byToken(token)
      if (!invitation || invitation.email !== normalized(email)) {
        throw new NotFoundError('There is no such invitation', 'INVITATION_NOT_FOUND')
      }
      if (await registered(invitation.email)) return { email: invitation.email, registered: true }
      if (invitation.expiresAt <= now()) throw new NotFoundError('The invitation has expired', 'INVITATION_EXPIRED')
      return { email: invitation.email, registered: false }
    },

    /**
     * Whether a sign-up for `email` that carries `token` is invited. Null when
     * the token isn't an open invitation's.
     * @param {string} token
     * @param {string} email
     * @returns {Promise<Admission | null>}
     */
    async admits(token, email) {
      const invitation = await byToken(token)
      if (!invitation || invitation.expiresAt <= now()) return null
      return invitation.email === normalized(email) ? 'admitted' : 'other-email'
    },

    /** Marks the email's invitation accepted, once it has an account. @param {string} email */
    async accept(email) {
      await db
        .update(invitations)
        .set({ acceptedAt: now() })
        .where(and(eq(invitations.email, normalized(email)), isNull(invitations.acceptedAt)))
    },
  }
}
