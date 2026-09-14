/**
 * Families and the adults who belong to them. Each adult has one family for
 * now; the second parent joins in 0.6, and kids, the pet, and toys arrive
 * with the data model.
 */
import { withTransaction } from '../db/transaction.js'

/** @typedef {{ id: string, name: string | null }} Family */
/** @typedef {ReturnType<typeof createFamiliesService>} FamiliesService */

/** @param {{ db: import('pg').Pool }} deps */
export function createFamiliesService({ db }) {
  return {
    /**
     * Creates a family with this adult as its first member. Both rows are
     * written in one transaction, so a family never exists without a member.
     * @param {string} userId
     * @param {{ name?: string | null }} [details]
     * @returns {Promise<Family>}
     */
    async create(userId, { name = null } = {}) {
      return withTransaction(db, async (client) => {
        const { rows } = await client.query('insert into families (name) values ($1) returning id, name', [name])
        const family = rows[0]
        await client.query('insert into family_members (family_id, user_id) values ($1, $2)', [family.id, userId])
        return family
      })
    },

    /** @param {string} userId @returns {Promise<Family | null>} */
    async familyOf(userId) {
      const { rows } = await db.query(
        `select f.id, f.name
         from families f
         join family_members m on m.family_id = f.id
         where m.user_id = $1`,
        [userId],
      )
      return rows[0] ?? null
    },
  }
}
