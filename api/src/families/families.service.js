/**
 * Families: the adults who belong to them, and the profile everything is
 * tailored to (kids, pets, interests, and toys). Each adult has one family for
 * now; the second parent joins in 0.6.
 */
import { and, eq, notInArray, sql } from 'drizzle-orm'
import { families, familyMembers, interests, kids, kidsSittingOut, pets } from './families.schema.js'
import { toys } from '../toys/toys.schema.js'
import { NotFoundError, ValidationError } from '../errors.js'

/** @typedef {{ id: string, name: string | null }} Family */
/**
 * @typedef {{ id: string, name: string, age: number | null, playing: boolean }} Kid
 * `playing` is for the adult asking (JUG-107); with no adult named, every kid plays.
 */
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
/** @typedef {import('../db/client.js').Db} Db */
/** @typedef {import('../db/client.js').Tx} Tx */
/** @typedef {ReturnType<typeof createFamiliesService>} FamiliesService */

/**
 * A kid's age today: the age the parent gave, plus the years since they gave it.
 * @param {{ ageYears: import('drizzle-orm').Column, ageSetOn: import('drizzle-orm').Column }} kid
 */
const currentAge = (kid) => sql`${kid.ageYears} + extract(year from age(current_date, ${kid.ageSetOn}))::int`

/** Profile rows come back in the order the parent gave them. */
const byPosition = (
  /** @type {{ position: import('drizzle-orm').Column }} */ row,
  /** @type {{ asc: typeof import('drizzle-orm').asc }} */ { asc },
) => asc(row.position)

/** The kids a story or a juego is for, in one canonical order. @param {Pick<Profile, 'kids'>} profile */
export const kidIdsOf = (profile) => profile.kids.map((kid) => kid.id).sort()

/**
 * The profile with only these kids, or with all of them when none of these
 * is in the family any more.
 * @param {Profile} profile
 * @param {string[]} kidIds
 * @returns {Profile}
 */
export function withKids(profile, kidIds) {
  const chosen = profile.kids.filter((kid) => kidIds.includes(kid.id))
  return { ...profile, kids: chosen.length > 0 ? chosen : profile.kids }
}

/** @param {{ db: Db }} deps */
export function createFamiliesService({ db }) {
  /**
   * @param {string} familyId
   * @param {string | null} [userId] the adult asking, whose kids sitting out come back not playing
   * @returns {Promise<Profile>}
   */
  async function profileOf(familyId, userId = null) {
    const family = await db.query.families.findFirst({
      columns: { id: true, name: true },
      where: eq(families.id, familyId),
      with: {
        kids: {
          columns: { id: true, name: true },
          extras: (kid) => ({ age: currentAge(kid).mapWith(Number).as('age') }),
          orderBy: byPosition,
        },
        pets: { columns: { id: true, name: true }, orderBy: byPosition },
        interests: { columns: { label: true }, orderBy: byPosition },
        toys: { columns: { id: true, name: true }, orderBy: byPosition },
      },
    })
    if (!family) throw new NotFoundError('No such family')
    const out = new Set()
    if (userId) {
      const rows = await db.select({ kidId: kidsSittingOut.kidId }).from(kidsSittingOut).where(eq(kidsSittingOut.userId, userId))
      for (const row of rows) out.add(row.kidId)
    }
    // At least one kid always plays: when the one left playing was removed, everyone plays again.
    const nobodyPlays = family.kids.every((kid) => out.has(kid.id))
    return {
      ...family,
      kids: family.kids.map((kid) => ({ ...kid, playing: nobodyPlays || !out.has(kid.id) })),
      interests: family.interests.map((row) => row.label),
    }
  }

  return {
    profileOf,

    /**
     * The profile as this adult plays right now: only the kids playing.
     * @param {string} familyId
     * @param {string | null} userId
     * @returns {Promise<Profile>}
     */
    async playingProfile(familyId, userId) {
      const profile = await profileOf(familyId, userId)
      return { ...profile, kids: profile.kids.filter((kid) => kid.playing) }
    },

    /**
     * Says which of the family's kids play with this adult, from now on and on
     * every device; the rest sit out. At least one of them must play. Ids that
     * aren't the family's kids (one removed since the screen loaded) are ignored.
     * @param {string} userId
     * @param {string[]} kidIds
     * @returns {Promise<Profile>}
     */
    async choosePlaying(userId, kidIds) {
      const familyId = await familyIdOf(db, userId)
      if (!familyId) throw new NotFoundError('No family yet')
      const familyKids = await db.select({ id: kids.id }).from(kids).where(eq(kids.familyId, familyId))
      const chosen = new Set(kidIds)
      if (!familyKids.some((kid) => chosen.has(kid.id))) {
        throw new ValidationError('At least one of the family kids plays', 'NO_KID_PLAYING')
      }
      const out = familyKids.filter((kid) => !chosen.has(kid.id))
      await db.transaction(async (tx) => {
        await tx.delete(kidsSittingOut).where(eq(kidsSittingOut.userId, userId))
        if (out.length > 0) await tx.insert(kidsSittingOut).values(out.map((kid) => ({ userId, kidId: kid.id })))
      })
      return profileOf(familyId, userId)
    },

    /**
     * Creates a family with this adult as its first member. Both rows are
     * written in one transaction, so a family never exists without a member.
     * @param {string} userId
     * @param {{ name?: string | null }} [details]
     * @returns {Promise<Family>}
     */
    async create(userId, { name = null } = {}) {
      return db.transaction((tx) => insertFamily(tx, userId, name))
    },

    /** @param {string} userId @returns {Promise<Family | null>} */
    async familyOf(userId) {
      const [family] = await db
        .select({ id: families.id, name: families.name })
        .from(families)
        .innerJoin(familyMembers, eq(familyMembers.familyId, families.id))
        .where(eq(familyMembers.userId, userId))
      return family ?? null
    },

    /** @param {string} userId @returns {Promise<string | null>} */
    idOf(userId) {
      return familyIdOf(db, userId)
    },

    /**
     * Saves the adult's whole family profile, starting their family if they
     * don't have one yet. All of it lands in one transaction.
     * @param {string} userId
     * @param {ProfileInput} input
     * @returns {Promise<Profile>}
     */
    async saveProfile(userId, input) {
      const familyId = await db.transaction(async (tx) => {
        // Two first saves at once must not start two families.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
        let familyId = await familyIdOf(tx, userId)
        if (!familyId) familyId = (await insertFamily(tx, userId, input.name ?? null)).id
        else if (input.name !== undefined) await tx.update(families).set({ name: input.name }).where(eq(families.id, familyId))

        await syncRows(tx, kids, familyId, input.kids, {
          insert: (kid, position) => ({
            position,
            name: kid.name,
            ageYears: kid.age,
            ageSetOn: kid.age === null ? null : sql`current_date`,
          }),
          // An age that comes back unchanged keeps counting from the day it was first given.
          update: (kid, position) => {
            const unchanged = sql`${kid.age}::smallint is not distinct from ${currentAge(kids)}`
            return {
              position,
              name: kid.name,
              ageYears: sql`case when ${unchanged} then ${kids.ageYears} else ${kid.age}::smallint end`,
              ageSetOn: sql`case when ${unchanged} then ${kids.ageSetOn} when ${kid.age}::smallint is null then null else current_date end`,
            }
          },
        })
        await syncRows(tx, pets, familyId, input.pets, nameOnly)
        await syncRows(tx, toys, familyId, input.toys, nameOnly)
        await tx.delete(interests).where(eq(interests.familyId, familyId))
        if (input.interests.length > 0) {
          await tx.insert(interests).values(input.interests.map((label, position) => ({ familyId, position, label })))
        }
        return familyId
      })
      return profileOf(familyId, userId)
    },
  }
}

/** @param {Db | Tx} db @param {string} userId @returns {Promise<string | null>} */
async function familyIdOf(db, userId) {
  const [member] = await db
    .select({ familyId: familyMembers.familyId })
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId))
  return member?.familyId ?? null
}

/** @param {Tx} tx @param {string} userId @param {string | null} name @returns {Promise<Family>} */
async function insertFamily(tx, userId, name) {
  const [family] = await tx.insert(families).values({ name }).returning({ id: families.id, name: families.name })
  await tx.insert(familyMembers).values({ familyId: family.id, userId })
  return family
}

/**
 * The profile knows pets and toys only by name, in order. Updating a toy
 * leaves the rest of what the toy box knows about it alone.
 */
const nameOnly = {
  /** @param {{ name: string }} item @param {number} position */
  insert: ({ name }, position) => ({ name, position }),
  /** @param {{ name: string }} item @param {number} position */
  update: ({ name }, position) => ({ name, position }),
}

/**
 * Makes the family's rows in `table` match `items`, in order: an item that
 * carries the id of one of the family's rows updates it, any other is
 * inserted, and the family's other rows are deleted.
 * @template {{ id?: string }} Item
 * @param {Tx} tx
 * @param {typeof kids | typeof pets | typeof toys} table
 * @param {string} familyId
 * @param {Item[]} items
 * @param {{ insert: (item: Item, position: number) => object, update: (item: Item, position: number) => object }} values
 */
async function syncRows(tx, table, familyId, items, values) {
  /** @type {string[]} */
  const kept = []
  for (const [position, item] of items.entries()) {
    const [updated] = item.id
      ? await tx
          .update(table)
          .set(values.update(item, position))
          .where(and(eq(table.id, item.id), eq(table.familyId, familyId)))
          .returning({ id: table.id })
      : []
    const [row] = updated
      ? [updated]
      : await tx
          .insert(table)
          .values({ familyId, ...values.insert(item, position) })
          .returning({ id: table.id })
    kept.push(row.id)
  }
  await tx.delete(table).where(and(eq(table.familyId, familyId), notInArray(table.id, kept)))
}
