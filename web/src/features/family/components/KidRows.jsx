import { FieldControl, FieldGroup } from '../../../shared/ui'

/** @typedef {import('../model').FormState['kids']} Kids */

/**
 * The kids in the family form: a name, the years and the months on each row,
 * and a link for one more. Being one is very different from being one and ten
 * months, so the months are asked for and shown, even when they are zero
 * (JUG-145). Ages keep only digits.
 * @param {{ kids: Kids, onChange: (change: (kids: Kids) => Kids) => void }} props
 */
export function KidRows({ kids, onChange }) {
  /** @param {number} index @param {Partial<Kids[number]>} patch */
  const edit = (index, patch) => onChange((all) => all.map((kid, i) => (i === index ? { ...kid, ...patch } : kid)))

  return (
    <FieldGroup label="Chicos">
      <div className="kid-rows">
        {kids.map((kid, index) => (
          <div key={index} className="kid-row">
            <FieldControl
              className="kid-row__name"
              aria-label={`Nombre ${index + 1}`}
              data-field={`kids.${index}`}
              autoCapitalize="words"
              autoCorrect="off"
              value={kid.name}
              onChange={(event) => edit(index, { name: event.target.value })}
            />
            <FieldControl
              className="kid-row__age"
              aria-label={`Edad ${index + 1}, en años`}
              inputMode="numeric"
              maxLength={2}
              suffix={kid.years === '1' ? 'año' : 'años'}
              value={kid.years}
              onChange={(event) => edit(index, { years: event.target.value.replace(/\D/g, '') })}
            />
            <FieldControl
              className="kid-row__age"
              aria-label={`Edad ${index + 1}, meses`}
              inputMode="numeric"
              maxLength={2}
              suffix={kid.months === '1' ? 'mes' : 'meses'}
              value={kid.months}
              onChange={(event) => edit(index, { months: event.target.value.replace(/\D/g, '') })}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="add-link"
        onClick={() => onChange((all) => [...all, { name: '', years: '', months: '', interests: [] }])}
      >
        + agregar otro chico
      </button>
    </FieldGroup>
  )
}
