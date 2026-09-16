import { ChipInput, Chips, FieldGroup } from '../../../shared/ui'

/**
 * What one kid loves, as chips (JUG-144): a tap removes one, and the + chip
 * adds one as typed. The one being typed belongs to the form, so saving
 * includes it. `field` is where a flagged row of the card opens the form.
 * @param {{
 *   label: string,
 *   field: string,
 *   interests: string[],
 *   draft: string | null,
 *   onDraft: (draft: string | null) => void,
 *   onCommit: () => void,
 *   onRemove: (index: number) => void,
 * }} props
 */
export function InterestChips({ label, field, interests, draft, onDraft, onCommit, onRemove }) {
  return (
    <FieldGroup label={label}>
      <Chips items={interests} onRemove={onRemove}>
        <ChipInput
          value={draft}
          onChange={onDraft}
          onCommit={onCommit}
          field={field}
          addLabel="Agregar algo que le encanta"
          inputLabel="Algo que le encanta"
        />
      </Chips>
    </FieldGroup>
  )
}
