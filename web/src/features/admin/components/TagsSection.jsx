import { TextArea } from './TemplateInputs'
import { Label } from '../../../shared/ui'

/** @typedef {import('../model').FormState} FormState */

/**
 * "Etiquetas": materials, skills, and safety rules, one per line. The safety
 * rules are part of the reviewed core, which adapting never changes.
 * @param {{ form: FormState, update: (change: Partial<FormState>) => void }} props
 */
export function TagsSection({ form, update }) {
  return (
    <>
      <Label>Etiquetas</Label>
      <TextArea label="Materiales" help="Uno por línea." value={form.materials} onChange={(materials) => update({ materials })} />
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
