/**
 * Families and the adults who belong to them. Each adult has one family for
 * now; the second parent joins in 0.6, and kids, the pet, and toys arrive
 * with the data model.
 */

/** @typedef {{ id: string, name: string | null }} Family */
/** @typedef {ReturnType<typeof createFamiliesService>} FamiliesService */

/** @param {{ db: import('pg').Pool }} deps */
export function createFamiliesService({ db }) {
  return {
    /**
     * Starts a family for a new adult. One statement, so a failure leaves
     * neither the family nor the membership behind.
     * @param {string} userId
     */
    async createFor(userId) {
      await db.query(
        `with family as (insert into families default values returning id)
         insert into family_members (family_id, user_id) select id, $1 from family`,
        [userId],
      )
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
