/**
 * Families: the adults who belong to them, and the profile everything is
 * tailored to (kids, pets, interests, and toys). Each adult has one family for
 * now; the second parent joins in 0.6.
 */
import { withTransaction } from '../db/transaction.js'
import { NotFoundError } from '../errors.js'

/** @typedef {{ id: string, name: string | null }} Family */
/** @typedef {{ id: string, name: string, age: number | null }} Kid */
/** @typedef {{ id: string, name: string }} Named */
/**
 * @typedef {{ id: string, name: string | null, kids: Kid[], pets: Named[], interests: string[], toys: Named[] }} Profile
 */
/**
 * @typedef {object} ProfileInput The whole profile, in order. Items that carry
 *   the id of one of the family's rows update it; the rest are new.
 * @property {string | null} [name]
 * @property {{ id?: string, name: string, age: number | null }[]} kids
 * @property {{ id?: string, name: string }[]} pets
 * @property {string[]} interests
 * @property {{ id?: string, name: string }[]} toys
 */
/** @typedef {import('pg').PoolClient} Client */
/** @typedef {ReturnType<typeof createFamiliesService>} FamiliesService */

// A kid's age today: the age the parent gave, plus the years since they gave it.
const CURRENT_AGE = 'age_years + extract(year from age(current_date, age_set_on))::int'

/** @param {{ db: import('pg').Pool }} deps */
export function createFamiliesService({ db }) {
  /** @param {string} familyId @returns {Promise<Profile>} */
  async function profileOf(familyId) {
    const [family, kids, pets, interests, toys] = await Promise.all([
      db.query('select id, name from families where id = $1', [familyId]),
      db.query(`select id, name, ${CURRENT_AGE} as age from kids where family_id = $1 order by position`, [familyId]),
      db.query('select id, name from pets where family_id = $1 order by position', [familyId]),
      db.query('select label from interests where family_id = $1 order by position', [familyId]),
      db.query('select id, name from toys where family_id = $1 order by position', [familyId]),
    ])
    if (!family.rows[0]) throw new NotFoundError('No such family')
    return {
      ...family.rows[0],
      kids: kids.rows,
      pets: pets.rows,
      interests: interests.rows.map((row) => row.label),
      toys: toys.rows,
    }
  }

  return {
    profileOf,

    /**
     * Creates a family with this adult as its first member. Both rows are
     * written in one transaction, so a family never exists without a member.
     * @param {string} userId
     * @param {{ name?: string | null }} [details]
     * @returns {Promise<Family>}
     */
    async create(userId, { name = null } = {}) {
      return withTransaction(db, (client) => insertFamily(client, userId, name))
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

    /** @param {string} userId @returns {Promise<string | null>} */
    async idOf(userId) {
      const { rows } = await db.query('select family_id as "familyId" from family_members where user_id = $1', [userId])
      return rows[0]?.familyId ?? null
    },

    /**
     * Saves the adult's whole family profile, starting their family if they
     * don't have one yet. All of it lands in one transaction.
     * @param {string} userId
     * @param {ProfileInput} input
     * @returns {Promise<Profile>}
     */
    async saveProfile(userId, { name, kids, pets, interests, toys }) {
      const familyId = await withTransaction(db, async (client) => {
        // Two first saves at once must not start two families.
        await client.query('select pg_advisory_xact_lock(hashtext($1))', [userId])
        const { rows } = await client.query('select family_id as "familyId" from family_members where user_id = $1', [
          userId,
        ])
        let familyId = rows[0]?.familyId
        if (!familyId) familyId = (await insertFamily(client, userId, name ?? null)).id
        else if (name !== undefined) await client.query('update families set name = $2 where id = $1', [familyId, name])

        await syncKids(client, familyId, kids)
        await syncNamed(client, 'pets', familyId, pets)
        await syncNamed(client, 'toys', familyId, toys)
        await client.query('delete from interests where family_id = $1', [familyId])
        for (const [position, label] of interests.entries()) {
          await client.query('insert into interests (family_id, position, label) values ($1, $2, $3)', [
            familyId,
            position,
            label,
          ])
        }
        return familyId
      })
      return profileOf(familyId)
    },
  }
}

/** @param {Client} client @param {string} userId @param {string | null} name @returns {Promise<Family>} */
async function insertFamily(client, userId, name) {
  const { rows } = await client.query('insert into families (name) values ($1) returning id, name', [name])
  const family = rows[0]
  await client.query('insert into family_members (family_id, user_id) values ($1, $2)', [family.id, userId])
  return family
}

/**
 * Makes the family's kids match `kids`, in order: a kid whose id comes back
 * is updated, any other is inserted, and the rest are deleted. An age that
 * comes back unchanged keeps counting from the day it was first given.
 * @param {Client} client @param {string} familyId @param {ProfileInput['kids']} kids
 */
async function syncKids(client, familyId, kids) {
  /** @type {string[]} */
  const kept = []
  for (const [position, kid] of kids.entries()) {
    const updated = kid.id
      ? await client.query(
          `update kids set
             name = $3,
             position = $4,
             age_years = case when $5::smallint is not distinct from ${CURRENT_AGE} then age_years else $5 end,
             age_set_on = case
               when $5::smallint is not distinct from ${CURRENT_AGE} then age_set_on
               when $5::smallint is null then null
               else current_date
             end
           where id = $1 and family_id = $2
           returning id`,
          [kid.id, familyId, kid.name, position, kid.age],
        )
      : null
    if (updated?.rowCount) {
      kept.push(updated.rows[0].id)
      continue
    }
    const { rows } = await client.query(
      `insert into kids (family_id, position, name, age_years, age_set_on)
       values ($1, $2, $3, $4::smallint, case when $4::smallint is null then null else current_date end)
       returning id`,
      [familyId, position, kid.name, kid.age],
    )
    kept.push(rows[0].id)
  }
  await client.query('delete from kids where family_id = $1 and id <> all($2::uuid[])', [familyId, kept])
}

/**
 * The same as syncKids, for rows that are only a name.
 * @param {Client} client
 * @param {'pets' | 'toys'} table a fixed name, never input
 * @param {string} familyId
 * @param {{ id?: string, name: string }[]} items
 */
async function syncNamed(client, table, familyId, items) {
  /** @type {string[]} */
  const kept = []
  for (const [position, item] of items.entries()) {
    const updated = item.id
      ? await client.query(`update ${table} set name = $3, position = $4 where id = $1 and family_id = $2 returning id`, [
          item.id,
          familyId,
          item.name,
          position,
        ])
      : null
    if (updated?.rowCount) {
      kept.push(updated.rows[0].id)
      continue
    }
    const { rows } = await client.query(`insert into ${table} (family_id, position, name) values ($1, $2, $3) returning id`, [
      familyId,
      position,
      item.name,
    ])
    kept.push(rows[0].id)
  }
  await client.query(`delete from ${table} where family_id = $1 and id <> all($2::uuid[])`, [familyId, kept])
}
