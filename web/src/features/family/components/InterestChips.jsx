import { ChipInput, Chips, FieldGroup } from '../../../shared/ui'

/**
 * What the family loves, as chips: a tap removes one, and the + chip adds one
 * as typed. The one being typed belongs to the form, so saving includes it.
 * @param {{
 *   interests: string[],
 *   draft: string | null,
 *   onDraft: (draft: string | null) => void,
 *   onCommit: () => void,
 *   onRemove: (index: number) => void,
 * }} props
 */
export function InterestChips({ interests, draft, onDraft, onCommit, onRemove }) {
  return (
    <FieldGroup label="Le encanta">
      <Chips items={interests} onRemove={onRemove}>
        <ChipInput
          value={draft}
          onChange={onDraft}
          onCommit={onCommit}
          field="interests"
          addLabel="Agregar algo que le encanta"
          inputLabel="Algo que le encanta"
        />
      </Chips>
    </FieldGroup>
  )
}
