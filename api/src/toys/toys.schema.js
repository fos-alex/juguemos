/**
 * The toy box's table: the family's toys. A toy belongs to a family, and may
 * belong to one kid.
 */
import { relations, sql } from 'drizzle-orm'
import { boolean, check, index, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from '../db/columns.js'
import { families, kids } from '../families/families.schema.js'

// The toy box (JUG-18). A toy's name is the family's own, the only one the
// parent ever sees; `description` says what the toy actually is, for the AI,
// which never infers anything from the name. Whose it is: `kidId`'s, `shared`,
// or neither when the family hasn't said. Toys the kid tells apart by
// comparison (el caballo grande and el caballo chico) share a `linkGroup`.
export const toys = pgTable(
  'toys',
  {
    id: uuid().primaryKey().defaultRandom(),
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
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

export const toysRelations = relations(toys, ({ one }) => ({
  family: one(families, { fields: [toys.familyId], references: [families.id] }),
}))
