import { FieldControl, FieldGroup } from '../../../shared/ui'

/** @typedef {import('../model').FormState['kids']} Kids */

/**
 * The kids in the family form: a name and an age in years on each row, and a
 * link for one more. Ages keep only digits.
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
              suffix={kid.age === '1' ? 'año' : 'años'}
              value={kid.age}
              onChange={(event) => edit(index, { age: event.target.value.replace(/\D/g, '') })}
            />
          </div>
        ))}
      </div>
      <button type="button" className="add-link" onClick={() => onChange((all) => [...all, { name: '', age: '' }])}>
        + agregar otro chico
      </button>
    </FieldGroup>
  )
}
