/**
 * The toy box's tables: the family's toys, and the household materials they
 * have. Both belong to a family, and a toy may belong to one kid.
 */
import { relations, sql } from 'drizzle-orm'
import { boolean, check, index, pgTable, primaryKey, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from '../db/columns.js'
import { families, kids } from '../families/families.schema.js'

const familyId = () =>
  uuid()
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' })

// The toy box (JUG-18). A toy's name is the family's own, the only one the
// parent ever sees; `description` says what the toy actually is, for the AI,
// which never infers anything from the name. Whose it is: `kidId`'s, `shared`,
// or neither when the family hasn't said. Toys the kid tells apart by
// comparison (el caballo grande and el caballo chico) share a `linkGroup`.
export const toys = pgTable(
  'toys',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: familyId(),
    position: smallint().notNull(),
    name: text().notNull(),
    aliases: text().array().notNull().default(sql`'{}'`),
    description: text(),
    kidId: uuid().references(() => kids.id, { onDelete: 'set null' }),
    shared: boolean().notNull().default(false),
    favorite: boolean().notNull().default(false),
    linkGroup: uuid(),
    createdAt: createdAt(),
  },
  (table) => [
    index('toys_family_id_idx').on(table.familyId),
    check('toys_name_check', sql`${table.name} <> ''`),
    check('toys_owner_check', sql`not (${table.shared} and ${table.kidId} is not null)`),
  ],
)

// The household materials each family has, by their key in
// src/toys/materials.js. They need no family name.
export const householdMaterials = pgTable(
  'household_materials',
  {
    familyId: familyId(),
    material: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.familyId, table.material] })],
)

/** @param {typeof toys | typeof householdMaterials} table */
const belongsToFamily = (table) =>
  relations(table, ({ one }) => ({ family: one(families, { fields: [table.familyId], references: [families.id] }) }))

export const toysRelations = belongsToFamily(toys)
export const householdMaterialsRelations = belongsToFamily(householdMaterials)
