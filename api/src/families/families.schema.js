/**
 * Families, the adults in them, and the profile everything is tailored to.
 * Profile rows keep the order the parent gave them in `position`, and names
 * stay exactly as typed.
 */
import { relations, sql } from 'drizzle-orm'
import { check, date, doublePrecision, index, pgTable, primaryKey, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { users } from '../auth/auth.schema.js'
import { createdAt } from '../db/columns.js'
import { householdMaterials } from '../materials/materials.schema.js'
import { toys } from '../toys/toys.schema.js'

export const families = pgTable(
  'families',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text(),
    // A key from HOMES in kinds.js, or null until the family says (JUG-21).
    home: text(),
    // Where the family lives, for the weather (JUG-25): their own words, as
    // typed, and the city the geocoder put them in. Only the weather reads
    // it, so a city or a zone is enough and these are never a home's
    // coordinates; a place nobody could find keeps the words with no
    // coordinates.
    location: text(),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    createdAt: createdAt(),
  },
  (table) => [
    check('families_location_check', sql`${table.location} <> ''`),
    check(
      'families_coordinates_check',
      sql`(${table.latitude} is null) = (${table.longitude} is null)
        and (${table.latitude} is null or (${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180))`,
    ),
  ],
)

// The adults with an account in each family. One family per adult for now;
// the second parent joins in 0.6.
export const familyMembers = pgTable(
  'family_members',
  {
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .unique('family_members_user_id_unique')
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.familyId, table.userId] })],
)

const familyId = () =>
  uuid()
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' })

export const kids = pgTable(
  'kids',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: familyId(),
    position: smallint().notNull(),
    name: text().notNull(),
    // Parents give an age in years and months (JUG-145). Counting from the day
    // they gave it keeps it current without asking for a birthday.
    ageMonths: smallint(),
    ageSetOn: date(),
    createdAt: createdAt(),
  },
  (table) => [
    index('kids_family_id_idx').on(table.familyId),
    check('kids_name_check', sql`${table.name} <> ''`),
    check('kids_age_months_check', sql`${table.ageMonths} between 0 and 215`),
    check('kids_age_check', sql`(${table.ageMonths} is null) = (${table.ageSetOn} is null)`),
  ],
)

export const pets = pgTable(
  'pets',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: familyId(),
    position: smallint().notNull(),
    name: text().notNull(),
    // A key from PET_KINDS in kinds.js (JUG-21).
    kind: text().notNull().default('perro'),
    createdAt: createdAt(),
  },
  (table) => [index('pets_family_id_idx').on(table.familyId), check('pets_name_check', sql`${table.name} <> ''`)],
)

// The parents, as the kids know them (JUG-21): a name, and what the kids call
// them, so a story can bring them in. None of them needs an account.
export const parents = pgTable(
  'parents',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: familyId(),
    position: smallint().notNull(),
    name: text().notNull(),
    calledAs: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('parents_family_id_idx').on(table.familyId),
    check('parents_name_check', sql`${table.name} <> ''`),
    check('parents_called_as_check', sql`${table.calledAs} <> ''`),
  ],
)

// What each kid loves (JUG-144), in the parent's order and words. Kids like
// different things, so interests belong to a kid, not to the family.
export const kidInterests = pgTable(
  'kid_interests',
  {
    id: uuid().primaryKey().defaultRandom(),
    kidId: uuid()
      .notNull()
      .references(() => kids.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    label: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('kid_interests_kid_id_idx').on(table.kidId),
    check('kid_interests_label_check', sql`${table.label} <> ''`),
  ],
)

// The kids each adult marked as not playing (JUG-107). Keeping who sits out,
// rather than who plays, is what makes a kid added later start out playing,
// and a kid removed from the family takes their rows along.
export const kidsSittingOut = pgTable(
  'kids_sitting_out',
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kidId: uuid()
      .notNull()
      .references(() => kids.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.kidId] })],
)

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  parents: many(parents),
  kids: many(kids),
  pets: many(pets),
  toys: many(toys),
  householdMaterials: many(householdMaterials),
}))

/** @param {typeof familyMembers | typeof pets | typeof parents} table */
const belongsToFamily = (table) =>
  relations(table, ({ one }) => ({ family: one(families, { fields: [table.familyId], references: [families.id] }) }))

export const familyMembersRelations = belongsToFamily(familyMembers)
export const petsRelations = belongsToFamily(pets)
export const parentsRelations = belongsToFamily(parents)

export const kidsRelations = relations(kids, ({ one, many }) => ({
  family: one(families, { fields: [kids.familyId], references: [families.id] }),
  interests: many(kidInterests),
}))

export const kidInterestsRelations = relations(kidInterests, ({ one }) => ({
  kid: one(kids, { fields: [kidInterests.kidId], references: [kids.id] }),
}))
