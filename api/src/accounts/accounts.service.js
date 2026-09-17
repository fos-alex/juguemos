/**
 * Accounts, as the admin manages them (JUG-175). Removing an account is the
 * only thing here for now: it lets Alex sign up again with the same email
 * while testing. A parent removing their own account comes later.
 */
import { eq } from 'drizzle-orm'
import { users } from '../auth/auth.schema.js'
import { families, familyMembers } from '../families/families.schema.js'
import { NotFoundError } from '../errors.js'

/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {ReturnType<typeof createAccountsService>} AccountsService */

/** @param {{ db: Db }} deps */
export function createAccountsService({ db }) {
  return {
    /**
     * Removes the account and everything it owns. Deleting the user takes its
     * sessions, its sign-in methods, its audit rows, and its membership along,
     * and deleting the family takes the kids, pets, toys, materials,
     * activities, stories, and series. Each adult has one family for now, so
     * the family goes with its only member.
     * @param {string} userId
     */
    async remove(userId) {
      await db.transaction(async (tx) => {
        const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
        if (!user) throw new NotFoundError('There is no such account', 'ACCOUNT_NOT_FOUND')
        const [membership] = await tx
          .select({ familyId: familyMembers.familyId })
          .from(familyMembers)
          .where(eq(familyMembers.userId, userId))
          .limit(1)
        if (membership) await tx.delete(families).where(eq(families.id, membership.familyId))
        await tx.delete(users).where(eq(users.id, userId))
      })
    },
  }
}
