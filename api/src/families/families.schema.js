/**
 * Families, the adults in them, and the profile everything is tailored to.
 * Profile rows keep the order the parent gave them in `position`, and names
 * stay exactly as typed.
 */
import { relations, sql } from 'drizzle-orm'
import { check, date, index, pgTable, primaryKey, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { users } from '../auth/auth.schema.js'
import { createdAt } from '../db/columns.js'

export const families = pgTable('families', {
  id: uuid().primaryKey().defaultRandom(),
  name: text(),
  createdAt: createdAt(),
})

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
    // Parents give an age in years. Counting from the day they gave it keeps it
    // current without asking for a birthday.
    ageYears: smallint(),
    ageSetOn: date(),
    createdAt: createdAt(),
  },
  (table) => [
    index('kids_family_id_idx').on(table.familyId),
    check('kids_name_check', sql`${table.name} <> ''`),
    check('kids_age_years_check', sql`${table.ageYears} between 0 and 17`),
    check('kids_age_check', sql`(${table.ageYears} is null) = (${table.ageSetOn} is null)`),
  ],
)

export const pets = pgTable(
  'pets',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: familyId(),
    position: smallint().notNull(),
    name: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('pets_family_id_idx').on(table.familyId), check('pets_name_check', sql`${table.name} <> ''`)],
)

export const interests = pgTable(
  'interests',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: familyId(),
    position: smallint().notNull(),
    label: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('interests_family_id_idx').on(table.familyId),
    check('interests_label_check', sql`${table.label} <> ''`),
  ],
)

// Toys by the family's own name for them. The description for the AI arrives
// with the toy box in 0.2, as a separate column.
export const toys = pgTable(
  'toys',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: familyId(),
    position: smallint().notNull(),
    name: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('toys_family_id_idx').on(table.familyId), check('toys_name_check', sql`${table.name} <> ''`)],
)

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  kids: many(kids),
  pets: many(pets),
  interests: many(interests),
  toys: many(toys),
}))

/** @param {typeof familyMembers | typeof kids | typeof pets | typeof interests | typeof toys} table */
const belongsToFamily = (table) =>
  relations(table, ({ one }) => ({ family: one(families, { fields: [table.familyId], references: [families.id] }) }))

export const familyMembersRelations = belongsToFamily(familyMembers)
export const kidsRelations = belongsToFamily(kids)
export const petsRelations = belongsToFamily(pets)
export const interestsRelations = belongsToFamily(interests)
export const toysRelations = belongsToFamily(toys)
