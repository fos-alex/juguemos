import { PET_KINDS } from '../model'
import { ChipToggle, Chips, FieldControl, FieldGroup } from '../../../shared/ui'

/** @typedef {import('../types').PetKind} PetKind */

/**
 * The pet in the family form: its name, as typed, and what animal it is
 * (JUG-21), a chip each, with one always chosen. A dog until the family says
 * otherwise.
 * @param {{ name: string, kind: PetKind, onName: (name: string) => void, onKind: (kind: PetKind) => void }} props
 */
export function PetField({ name, kind, onName, onKind }) {
  return (
    <FieldGroup label="Mascota">
      <FieldControl
        aria-label="Nombre de la mascota"
        data-field="pet"
        autoCapitalize="words"
        autoCorrect="off"
        value={name}
        onChange={(event) => onName(event.target.value)}
      />
      <Chips className="pet-kinds">
        {PET_KINDS.map((each) => (
          <ChipToggle key={each.key} pressed={kind === each.key} onClick={() => onKind(each.key)}>
            {each.label}
          </ChipToggle>
        ))}
      </Chips>
    </FieldGroup>
  )
}
