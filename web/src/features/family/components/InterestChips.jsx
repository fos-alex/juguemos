import { ChipInput, Chips, FieldGroup } from '../../../shared/ui'

/**
 * What one kid loves, as chips (JUG-144), on that kid's card: a tap removes
 * one, and the + chip adds one as typed. `field` is where a flagged row of
 * the card opens the form. `name` is the kid's, for the screen reader, since
 * every card says "Le encanta".
 * @param {{
 *   name: string,
 *   field: string,
 *   interests: string[],
 *   draft: string | null,
 *   onDraft: (draft: string | null) => void,
 *   onCommit: () => void,
 *   onRemove: (index: number) => void,
 * }} props
 */
export function InterestChips({ name, field, interests, draft, onDraft, onCommit, onRemove }) {
  return (
    <FieldGroup label="Le encanta" className="kid-card__interests">
      <Chips items={interests} onRemove={onRemove}>
        <ChipInput
          value={draft}
          onChange={onDraft}
          onCommit={onCommit}
          field={field}
          addLabel={name ? `Agregar algo que le encanta a ${name}` : 'Agregar algo que le encanta'}
          inputLabel={name ? `Algo que le encanta a ${name}` : 'Algo que le encanta'}
        />
      </Chips>
    </FieldGroup>
  )
}
