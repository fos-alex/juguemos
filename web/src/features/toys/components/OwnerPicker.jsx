import { SHARED } from '../model'
import { Chips, ChipToggle, FieldGroup } from '../../../shared/ui'

/** @typedef {import('../../family').Kid} Kid */

/**
 * Whose the toy is: one kid, all of them ("De todos"), or not said, which a
 * second tap on the chosen chip goes back to. Favorite sits in the same row.
 * @param {{
 *   kids: Kid[],
 *   whose: string | null,
 *   favorite: boolean,
 *   onWhose: (value: string) => void,
 *   onFavorite: () => void,
 * }} props
 */
export function OwnerPicker({ kids, whose, favorite, onWhose, onFavorite }) {
  const choices = [
    ...kids.map((kid) => ({ value: /** @type {string} */ (kid.id), label: kid.name })),
    { value: SHARED, label: 'De todos' },
  ]
  return (
    <FieldGroup label="De quién es">
      <Chips>
        {choices.map((choice) => (
          <ChipToggle key={choice.value} pressed={whose === choice.value} onClick={() => onWhose(choice.value)}>
            {choice.label}
          </ChipToggle>
        ))}
        <ChipToggle pressed={favorite} onClick={onFavorite}>
          Es un favorito
        </ChipToggle>
      </Chips>
    </FieldGroup>
  )
}
