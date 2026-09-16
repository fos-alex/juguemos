import { useEffect, useState } from 'react'
import { listMaterials } from '../api'
import { adminFailure } from '../model'
import { TextArea } from './TemplateInputs'
import { CheckIcon, Chips, FieldGroup, Label } from '../../../shared/ui'

/** @typedef {import('../model').FormState} FormState */
/** @typedef {import('../types').MaterialCategory} MaterialCategory */

/**
 * "Etiquetas": the materials, picked from the API's list by category, and
 * skills and safety rules, one per line. A family that has a template's
 * material marked off is never offered it (JUG-153). The safety rules are part
 * of the reviewed core, which adapting never changes.
 * @param {{ form: FormState, update: (change: Partial<FormState>) => void }} props
 */
export function TagsSection({ form, update }) {
  const [categories, setCategories] = useState(/** @type {MaterialCategory[] | null} */ (null))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    listMaterials().then(setCategories, (error) => setFailure(adminFailure(error)))
  }, [])

  /** @param {string} key */
  const toggle = (key) =>
    update({ materials: form.materials.includes(key) ? form.materials.filter((each) => each !== key) : [...form.materials, key] })

  return (
    <>
      <Label>Etiquetas</Label>
      <p className="field__help">
        Materiales: solo lo que el juego no puede hacer sin eso. Si la familia lo tiene desmarcado, no se lo ofrece.
      </p>
      {failure && <p className="field__error">{failure}</p>}
      {categories?.map((category) => (
        <FieldGroup key={category.key} label={category.label}>
          <Chips>
            {category.materials.map((material) => {
              const on = form.materials.includes(material.key)
              return (
                <button
                  key={material.key}
                  type="button"
                  className="chip admin-chip"
                  aria-pressed={on}
                  onClick={() => toggle(material.key)}
                >
                  {on && <CheckIcon size={16} />}
                  {material.label}
                </button>
              )
            })}
          </Chips>
        </FieldGroup>
      ))}
      <TextArea label="Habilidades" help="Una por línea." value={form.skills} onChange={(skills) => update({ skills })} />
      <TextArea
        label="Seguridad"
        help="Una regla por línea. Son parte del núcleo revisado: la adaptación nunca las cambia."
        value={form.safety}
        onChange={(safety) => update({ safety })}
      />
    </>
  )
}
