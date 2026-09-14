import { useEffect, useId, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ApiError, createTemplate, deleteTemplate, loadTemplate, saveTemplate } from '../api'
import { Dots, PrimaryButton, TertiaryButton } from '../components/Buttons'
import { Label } from '../components/Card'
import { Field } from '../components/Field'
import { Body, Footer, Header, Screen } from '../components/Screen'
import { useGoBack } from '../hooks/useGoBack'
import { adminFailure, CATEGORIES, ENERGIES, PLACES, SLOTS, slugFrom, unknownSlots } from '../lib/admin'

/** @typedef {import('../api/types').ActivityTemplate} ActivityTemplate */
/** @typedef {import('../api/types').ActivityTemplateFields} ActivityTemplateFields */
/**
 * @typedef {{
 *   slug: string, title: string, active: boolean, minutes: string, place: string,
 *   minAgeMonths: string, maxAgeMonths: string, energy: string, categories: string[], smallSpace: boolean,
 *   materials: string, skills: string, safety: string,
 *   why: string, needs: string, steps: string, easier: string, harder: string,
 * }} FormState
 * Numbers as typed, and lists one item per line.
 */
/** @typedef {Partial<Record<keyof FormState, string>>} Errors */

export const Route = createFileRoute('/admin/$id')({ component: TemplateScreen })

/** The id in /admin/nuevo, which adds a template instead of editing one. */
const NEW = 'nuevo'

/** @type {FormState} */
const EMPTY = {
  slug: '',
  title: '',
  active: true,
  minutes: '15',
  place: 'indoor',
  minAgeMonths: '12',
  maxAgeMonths: '47',
  energy: 'medium',
  categories: [],
  smallSpace: true,
  materials: '',
  skills: '',
  safety: '',
  why: '',
  needs: '',
  steps: '',
  easier: '',
  harder: '',
}

const SLOT_LIST = SLOTS.map((slot) => `{${slot}}`).join(' ')
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** @type {(keyof FormState)[]} */
const TEXTS = ['title', 'why', 'needs', 'steps', 'easier', 'harder']

/**
 * One activity template, every field of it, or a new one at /admin/nuevo.
 * Texts keep their slots unfilled; the API checks them again on save.
 */
function TemplateScreen() {
  const { id } = Route.useParams()
  const isNew = id === NEW
  const navigate = useNavigate()
  const goBack = useGoBack('/admin')
  const [form, setForm] = useState(/** @type {FormState | null} */ (isNew ? EMPTY : null))
  const [slugTouched, setSlugTouched] = useState(false)
  const [errors, setErrors] = useState(/** @type {Errors} */ ({}))
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    document.title = `${isNew ? 'Nuevo juego' : 'Editar juego'} · Admin · Juguemos`
  }, [isNew])

  useEffect(() => {
    if (isNew) return
    loadTemplate(id).then(
      (template) => setForm(toForm(template)),
      (error) =>
        setFailure(
          error instanceof ApiError && error.status === 404
            ? 'No encontré ese juego. Puede que lo hayan borrado.'
            : adminFailure(error),
        ),
    )
  }, [id, isNew])

  /** @param {Partial<FormState>} change */
  const update = (change) => setForm((current) => current && { ...current, ...change })

  /** @param {React.FormEvent} event */
  const save = async (event) => {
    event.preventDefault()
    if (!form || busy) return
    const found = check(form, isNew)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setFailure('Revisá los campos marcados.')
      return
    }
    setBusy(true)
    setFailure(null)
    try {
      if (isNew) await createTemplate({ slug: form.slug.trim(), ...toFields(form) })
      else await saveTemplate(id, toFields(form))
      void navigate({ to: '/admin' })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SLUG_TAKEN') {
        setErrors({ slug: 'Ya hay un juego con ese slug, o lo hubo: uno borrado lo sigue ocupando.' })
        setFailure('Revisá los campos marcados.')
      } else {
        setFailure(adminFailure(error))
      }
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!form || busy) return
    if (!window.confirm(`¿Borrar «${form.title}»? No se puede deshacer, y la semilla no lo vuelve a cargar.`)) return
    setBusy(true)
    setFailure(null)
    try {
      await deleteTemplate(id)
      void navigate({ to: '/admin' })
    } catch (error) {
      setFailure(adminFailure(error))
      setBusy(false)
    }
  }

  /** Keeps only digits, for the number fields. @param {keyof FormState} name */
  const digits = (name) => (/** @type {React.ChangeEvent<HTMLInputElement>} */ event) =>
    update({ [name]: event.target.value.replace(/\D/g, '') })

  return (
    <Screen className="admin">
      <Header onBack={goBack} title={isNew ? 'Nuevo juego' : 'Editar juego'} />
      {!form ? (
        <Body className="page-body">
          {failure ? (
            <p className="status-line" role="alert">
              {failure}
            </p>
          ) : (
            <Dots tone="page" />
          )}
        </Body>
      ) : (
        <form className="screen-form" onSubmit={save} noValidate>
          <Body className="form-body">
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
                  setSlugTouched(true)
                  update({ slug: event.target.value })
                }}
              />
            ) : (
              <p className="field__help">Slug: {form.slug}</p>
            )}
            <Check label="En uso: sale en ¡Juguemos!" checked={form.active} onChange={(active) => update({ active })} />

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
              Tiene que ser seguro para toda la franja: 12 a 47 meses es de 1 a 3 años. Se ofrece solo si todos los
              chicos de la familia entran.
            </p>
            <div className="admin-pair">
              <Field
                label="Minutos"
                inputMode="numeric"
                error={errors.minutes}
                value={form.minutes}
                onChange={digits('minutes')}
              />
              <Select label="Lugar" value={form.place} options={PLACES} onChange={(place) => update({ place })} />
            </div>
            <Select label="Energía" value={form.energy} options={ENERGIES} onChange={(energy) => update({ energy })} />
            <div className="field" role="group" aria-labelledby="categories-label">
              <p id="categories-label" className="field__label">
                Categorías
              </p>
              <div className="chips">
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
                          categories: on
                            ? form.categories.filter((each) => each !== category)
                            : [...form.categories, category],
                        })
                      }
                    >
                      {on ? `✓ ${name}` : name}
                    </button>
                  )
                })}
              </div>
              {errors.categories && <p className="field__error">{errors.categories}</p>}
            </div>
            <Check
              label="Entra en un espacio chico"
              checked={form.smallSpace}
              onChange={(smallSpace) => update({ smallSpace })}
            />

            <Label>Lo que lee la familia</Label>
            <p className="field__help">
              Espacios: {SLOT_LIST}. Un juguete es solo un nombre: nada concuerda en género con un espacio.
            </p>
            <TextArea label="Por qué ahora" error={errors.why} value={form.why} onChange={(why) => update({ why })} />
            <TextArea
              label="Qué necesitás"
              help="En minúscula, así el nombre de un juguete queda como lo escribe la familia."
              error={errors.needs}
              value={form.needs}
              onChange={(needs) => update({ needs })}
            />
            <TextArea
              label="Pasos"
              help="Uno por línea. Tres cortos es lo ideal."
              rows={4}
              error={errors.steps}
              value={form.steps}
              onChange={(steps) => update({ steps })}
            />
            <TextArea
              label="Más fácil"
              error={errors.easier}
              value={form.easier}
              onChange={(easier) => update({ easier })}
            />
            <TextArea
              label="Más difícil"
              error={errors.harder}
              value={form.harder}
              onChange={(harder) => update({ harder })}
            />

            <Label>Etiquetas</Label>
            <TextArea
              label="Materiales"
              help="Uno por línea."
              value={form.materials}
              onChange={(materials) => update({ materials })}
            />
            <TextArea
              label="Habilidades"
              help="Una por línea."
              value={form.skills}
              onChange={(skills) => update({ skills })}
            />
            <TextArea
              label="Seguridad"
              help="Una regla por línea. Son parte del núcleo revisado: la adaptación nunca las cambia."
              value={form.safety}
              onChange={(safety) => update({ safety })}
            />

            {!isNew && (
              <TertiaryButton size="inline" onClick={() => void remove()}>
                Borrar juego
              </TertiaryButton>
            )}
            {failure && (
              <p className="status-line" role="alert">
                {failure}
              </p>
            )}
          </Body>
          <Footer sticky>
            <PrimaryButton type="submit" busy={busy} busyLabel="Guardando">
              Guardar
            </PrimaryButton>
          </Footer>
        </form>
      )}
    </Screen>
  )
}

/**
 * A labelled text box, worded like Field: errors under it replace the help.
 * @param {{ label: string, help?: string, error?: string, rows?: number, value: string, onChange: (value: string) => void }} props
 */
function TextArea({ label, help, error, rows = 3, value, onChange }) {
  const id = useId()
  const note = error || help
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control admin-area">
        <textarea
          id={id}
          className="field__input"
          rows={rows}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${id}-note` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {note && (
        <p id={`${id}-note`} className={error ? 'field__error' : 'field__help'}>
          {note}
        </p>
      )}
    </div>
  )
}

/** @param {{ label: string, value: string, options: [string, string][], onChange: (value: string) => void }} props */
function Select({ label, value, options, onChange }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <select id={id} className="field__input" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map(([option, name]) => (
            <option key={option} value={option}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

/** @param {{ label: string, checked: boolean, onChange: (checked: boolean) => void }} props */
function Check({ label, checked, onChange }) {
  return (
    <label className="admin-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

/** @param {string} text */
const lines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/** @param {ActivityTemplate} template @returns {FormState} */
function toForm(template) {
  return {
    slug: template.slug,
    title: template.title,
    active: template.active,
    minutes: String(template.minutes),
    place: template.place,
    minAgeMonths: String(template.minAgeMonths),
    maxAgeMonths: String(template.maxAgeMonths),
    energy: template.energy,
    categories: template.categories,
    smallSpace: template.smallSpace,
    materials: template.materials.join('\n'),
    skills: template.skills.join('\n'),
    safety: template.safety.join('\n'),
    why: template.why,
    needs: template.needs,
    steps: template.steps.join('\n'),
    easier: template.easier,
    harder: template.harder,
  }
}

/** @param {FormState} form @returns {ActivityTemplateFields} */
function toFields(form) {
  return {
    title: form.title.trim(),
    active: form.active,
    minutes: Number(form.minutes),
    place: /** @type {ActivityTemplateFields['place']} */ (form.place),
    minAgeMonths: Number(form.minAgeMonths),
    maxAgeMonths: Number(form.maxAgeMonths),
    energy: /** @type {ActivityTemplateFields['energy']} */ (form.energy),
    categories: form.categories,
    smallSpace: form.smallSpace,
    materials: lines(form.materials),
    skills: lines(form.skills),
    safety: lines(form.safety),
    why: form.why.trim(),
    needs: form.needs.trim(),
    steps: lines(form.steps),
    easier: form.easier.trim(),
    harder: form.harder.trim(),
  }
}

/** The form's own checks, worded under each field. @param {FormState} form @param {boolean} isNew @returns {Errors} */
function check(form, isNew) {
  /** @type {Errors} */
  const errors = {}
  if (isNew && !SLUG.test(form.slug.trim())) errors.slug = 'Solo minúsculas, números y guiones, como la-busqueda.'

  const minutes = Number(form.minutes)
  if (!form.minutes || minutes < 1 || minutes > 240) errors.minutes = 'Entre 1 y 240 minutos.'
  const min = Number(form.minAgeMonths)
  const max = Number(form.maxAgeMonths)
  if (!form.minAgeMonths || min > 215) errors.minAgeMonths = 'Entre 0 y 215 meses.'
  if (!form.maxAgeMonths || max > 215) errors.maxAgeMonths = 'Entre 0 y 215 meses.'
  else if (form.minAgeMonths && max < min) errors.maxAgeMonths = 'No puede ser menos que “desde”.'

  if (form.categories.length === 0) errors.categories = 'Elegí al menos una.'
  if (lines(form.steps).length > 10) errors.steps = 'Como mucho diez pasos.'

  for (const name of TEXTS) {
    const value = /** @type {string} */ (form[name])
    const unknown = unknownSlots(value)
    if (!value.trim()) errors[name] = 'Falta completarlo.'
    else if (unknown.length > 0) errors[name] = `${unknown.join(', ')} no es un espacio. Los que hay: ${SLOT_LIST}.`
  }
  return errors
}
