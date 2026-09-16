/**
 * The household materials each family has said it has or hasn't.
 */
import { relations } from 'drizzle-orm'
import { boolean, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from '../db/columns.js'
import { families } from '../families/families.schema.js'

// The family's answers, by the material's key in src/materials/materials.js.
// A material with no row here is at its default, so only a tap writes one.
export const householdMaterials = pgTable(
  'household_materials',
  {
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    material: text().notNull(),
    have: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.familyId, table.material] })],
)

export const householdMaterialsRelations = relations(householdMaterials, ({ one }) => ({
  family: one(families, { fields: [householdMaterials.familyId], references: [families.id] }),
}))
