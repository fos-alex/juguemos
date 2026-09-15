import { ChipInput, Chips, FieldGroup } from '../../../shared/ui'

/**
 * The toy's other names as chips: a tap removes one, and the + chip adds one
 * as typed. The one being typed belongs to the form, so saving includes it.
 * @param {{
 *   aliases: string[],
 *   draft: string | null,
 *   onDraft: (draft: string | null) => void,
 *   onCommit: () => void,
 *   onRemove: (index: number) => void,
 * }} props
 */
export function AliasPicker({ aliases, draft, onDraft, onCommit, onRemove }) {
  return (
    <FieldGroup label="Otros nombres">
      <Chips items={aliases} onRemove={onRemove}>
        <ChipInput
          value={draft}
          onChange={onDraft}
          onCommit={onCommit}
          addLabel="Agregar otro nombre"
          inputLabel="Otro nombre"
          maxLength={120}
        />
      </Chips>
      <p className="field__help">Cómo más le dicen, como «el tuto».</p>
    </FieldGroup>
  )
}
