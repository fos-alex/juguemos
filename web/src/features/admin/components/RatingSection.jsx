import { RATINGS, reactionsLine } from '../model'
import { Select } from './TemplateInputs'
import { Label } from '../../../shared/ui'

/** @typedef {import('../model').FormState} FormState */
/** @typedef {import('../types').Reactions} Reactions */

/**
 * "Puntaje" (JUG-192): the rating every family's ranking starts from, and,
 * for a template already in the catalog, its rating now with the reactions
 * that moved it.
 * @param {{ form: FormState, reactions: Reactions | null, update: (change: Partial<FormState>) => void }} props
 */
export function RatingSection({ form, reactions, update }) {
  return (
    <>
      <Label>Puntaje</Label>
      <Select label="Puntaje inicial" value={form.rating} options={RATINGS} onChange={(rating) => update({ rating })} />
      <p className="field__help">
        Vale para todas las familias: con 5 sale unas cinco veces más seguido que con 3, y con 1, unas diez veces menos.
        Cada ¡Lo hicimos! y cada No era para nosotros lo mueven desde acá.
      </p>
      {reactions && <p className="field__help">Puntaje ahora: {reactionsLine(reactions)}</p>}
    </>
  )
}
