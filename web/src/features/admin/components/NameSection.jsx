import { SLOT_LIST, slugFrom } from '../model'
import { Check } from './TemplateInputs'
import { Field } from '../../../shared/ui'

/** @typedef {import('../model').FormState} FormState */
/** @typedef {import('../model').Errors} Errors */

/**
 * The template's title, its slug, and whether it's in use. A new template's
 * slug follows the title until someone types in it, and never changes after.
 * @param {{
 *   form: FormState,
 *   errors: Errors,
 *   update: (change: Partial<FormState>) => void,
 *   isNew: boolean,
 *   slugTouched: boolean,
 *   onSlugTouched: () => void,
 * }} props
 */
export function NameSection({ form, errors, update, isNew, slugTouched, onSlugTouched }) {
  return (
    <>
      <Field
        label="Título"
        help={`Espacios: ${SLOT_LIST}`}
        error={errors.title}
        maxLength={120}
        value={form.title}
        onChange={(event) =>
          update({
            title: event.target.value,
            ...(isNew && !slugTouched ? { slug: slugFrom(event.target.value) } : {}),
          })
        }
      />
      {isNew ? (
        <Field
          label="Slug"
          help="Cómo lo conocen las semillas. No cambia después."
          error={errors.slug}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={80}
          value={form.slug}
          onChange={(event) => {
            onSlugTouched()
            update({ slug: event.target.value })
          }}
        />
      ) : (
        <p className="field__help">Slug: {form.slug}</p>
      )}
      <Check label="En uso: sale en ¡Juguemos!" checked={form.active} onChange={(active) => update({ active })} />
    </>
  )
}
