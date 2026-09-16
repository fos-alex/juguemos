import { joining } from '../model'
import { AliasPicker } from './AliasPicker'
import { OwnerPicker } from './OwnerPicker'
import { AS_TYPED, Chips, ChipToggle, Field, FieldGroup } from '../../../shared/ui'

/** @typedef {import('../model').FormState} FormState */
/** @typedef {import('../types').Toy} Toy */
/** @typedef {import('../../family').Kid} Kid */

/**
 * The toy's fields: its family name, other names, what it is (for Ludi,
 * never shown in place of the name), whose it is and whether it's a favorite,
 * and the toys it goes with.
 * @param {{
 *   form: FormState,
 *   update: (change: (draft: FormState) => FormState) => void,
 *   nameError: string | null,
 *   onNameEdit: () => void,
 *   alias: { draft: string | null, onDraft: (draft: string | null) => void, onCommit: () => void },
 *   kids: Kid[],
 *   others: Toy[],
 *   self: string | null,
 * }} props
 * `others` is the rest of the box, and `self` this toy's id, or null for a new one.
 */
export function ToyForm({ form, update, nameError, onNameEdit, alias, kids, others, self }) {
  return (
    <>
      <Field
        label="Cómo lo llaman en casa"
        data-field="name"
        maxLength={120}
        {...AS_TYPED}
        error={nameError}
        value={form.name}
        onChange={(event) => {
          onNameEdit()
          const name = event.target.value
          update((f) => ({ ...f, name }))
        }}
      />

      <AliasPicker
        aliases={form.aliases}
        draft={alias.draft}
        onDraft={alias.onDraft}
        onCommit={alias.onCommit}
        onRemove={(index) => update((f) => ({ ...f, aliases: f.aliases.filter((_, i) => i !== index) }))}
      />

      <div className="field">
        <label className="field__label" htmlFor="toy-description">
          Qué es
        </label>
        <div className="field__control field__control--area">
          <textarea
            id="toy-description"
            className="field__input"
            rows={3}
            maxLength={500}
            aria-describedby="toy-description-help"
            value={form.description}
            onChange={(event) => {
              const description = event.target.value
              update((f) => ({ ...f, description }))
            }}
          />
        </div>
        <p id="toy-description-help" className="field__help">
          Para que Ludi sepa qué es: tipo, tamaño y material, como «T-rex de plástico duro, unos 8 cm». Nunca
          reemplaza el nombre.
        </p>
      </div>

      <OwnerPicker
        kids={kids}
        whose={form.whose}
        favorite={form.favorite}
        onWhose={(value) => update((f) => ({ ...f, whose: f.whose === value ? null : value }))}
        onFavorite={() => update((f) => ({ ...f, favorite: !f.favorite }))}
      />

      {others.length > 0 && (
        <FieldGroup label="Va con">
          <Chips>
            {others.map((other) => (
              <ChipToggle
                key={other.id}
                pressed={form.linked.includes(other.id)}
                onClick={() =>
                  update((f) => ({
                    ...f,
                    linked: f.linked.includes(other.id)
                      ? f.linked.filter((each) => each !== other.id)
                      : joining(f.linked, other, self),
                  }))
                }
              >
                {other.name}
              </ChipToggle>
            ))}
          </Chips>
          <p className="field__help">Los que se distinguen comparándolos, como el caballo grande y el caballo chico.</p>
        </FieldGroup>
      )}
    </>
  )
}
