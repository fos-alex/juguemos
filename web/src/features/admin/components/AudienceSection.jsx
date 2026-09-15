import { CATEGORIES, ENERGIES, PLACES } from '../model'
import { Check, Select } from './TemplateInputs'
import { Chips, Field, FieldGroup, Label } from '../../../shared/ui'

/** @typedef {import('../model').FormState} FormState */
/** @typedef {import('../model').Errors} Errors */

/**
 * "Para quién y dónde": the age range in months, minutes and place, energy,
 * the categories, and whether it fits in a small space. The number fields
 * keep only digits.
 * @param {{ form: FormState, errors: Errors, update: (change: Partial<FormState>) => void }} props
 */
export function AudienceSection({ form, errors, update }) {
  /** @param {keyof FormState} name */
  const digits = (name) => (/** @type {React.ChangeEvent<HTMLInputElement>} */ event) =>
    update({ [name]: event.target.value.replace(/\D/g, '') })

  return (
    <>
      <Label>Para quién y dónde</Label>
      <div className="admin-pair">
        <Field
          label="Desde (meses)"
          inputMode="numeric"
          error={errors.minAgeMonths}
          value={form.minAgeMonths}
          onChange={digits('minAgeMonths')}
        />
        <Field
          label="Hasta (meses)"
          inputMode="numeric"
          error={errors.maxAgeMonths}
          value={form.maxAgeMonths}
          onChange={digits('maxAgeMonths')}
        />
      </div>
      <p className="field__help">
        Tiene que ser seguro para toda la franja: 12 a 47 meses es de 1 a 3 años. Se ofrece solo si todos los chicos de
        la familia entran.
      </p>
      <div className="admin-pair">
        <Field label="Minutos" inputMode="numeric" error={errors.minutes} value={form.minutes} onChange={digits('minutes')} />
        <Select label="Lugar" value={form.place} options={PLACES} onChange={(place) => update({ place })} />
      </div>
      <Select label="Energía" value={form.energy} options={ENERGIES} onChange={(energy) => update({ energy })} />
      <FieldGroup label="Categorías">
        <Chips>
          {CATEGORIES.map(([category, name]) => {
            const on = form.categories.includes(category)
            return (
              <button
                key={category}
                type="button"
                className="chip admin-chip"
                aria-pressed={on}
                onClick={() =>
                  update({
                    categories: on ? form.categories.filter((each) => each !== category) : [...form.categories, category],
                  })
                }
              >
                {on ? `✓ ${name}` : name}
              </button>
            )
          })}
        </Chips>
        {errors.categories && <p className="field__error">{errors.categories}</p>}
      </FieldGroup>
      <Check label="Entra en un espacio chico" checked={form.smallSpace} onChange={(smallSpace) => update({ smallSpace })} />
    </>
  )
}
