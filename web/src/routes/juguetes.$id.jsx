import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { addToy, editToy, linkToy, loadToyBox, removeToy } from '../api'
import { PrimaryButton, SecondaryButton, TertiaryButton } from '../shared/ui/Buttons'
import { Skeleton } from '../shared/ui/Card'
import { ChipInput, Chips, ChipToggle } from '../shared/ui/Chips'
import { AS_TYPED, Field, FieldGroup } from '../shared/ui/Field'
import { Body, Footer, Header, Screen } from '../shared/ui/Screen'
import { useGoBack } from '../shared/hooks/useGoBack'
import { useOnline } from '../shared/hooks/useOnline'
import { failureText } from '../shared/format'
import { useStored } from '../shared/store'
import { StatusLine } from '../shared/ui/StatusLine'

/** @typedef {import('../api/types').Toy} Toy */
/** @typedef {import('../api/types').ToyChanges} ToyChanges */
/**
 * @typedef {{
 *   name: string, aliases: string[], description: string,
 *   whose: string | null, favorite: boolean, linked: string[],
 * }} FormState
 * `whose` is a kid's id, SHARED, or null when the family hasn't said.
 */

export const Route = createFileRoute('/juguetes/$id')({
  component: ToyScreen,
})

/** The id in /juguetes/nuevo, which adds a toy instead of editing one. */
const NEW = 'nuevo'
const SHARED = 'shared'



/** @type {FormState} */
const EMPTY = { name: '', aliases: [], description: '', whose: null, favorite: false, linked: [] }

/**
 * One toy in the toy box, or a new one at /juguetes/nuevo: its family name,
 * other names, what it is (for Juguemos, never shown in place of the name),
 * whose it is, favorite, and the toys it goes with. Built before the 0.2
 * design (JUG-84); all of its copy needs a voice pass.
 */
function ToyScreen() {
  const { id } = Route.useParams()
  const isNew = id === NEW
  const goBack = useGoBack('/juguetes')
  const online = useOnline()
  const box = useStored('toyBox')
  const family = useStored('family')
  const toy = box?.toys.find((each) => each.id === id)
  const [form, setForm] = useState(/** @type {FormState | null} */ (isNew ? EMPTY : toy ? toForm(toy) : null))
  const [newAlias, setNewAlias] = useState(/** @type {string | null} */ (null))
  const [nameError, setNameError] = useState(/** @type {string | null} */ (null))
  const [request, setRequest] = useState(/** @type {'idle' | 'saving' | 'confirm' | 'removing'} */ ('idle'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    document.title = `${isNew ? 'Nuevo juguete' : 'Juguete'} · Juguemos`
  }, [isNew])

  // Opened straight from a link, before this device has the box.
  useEffect(() => {
    if (!box && navigator.onLine) loadToyBox().catch((error) => setFailure(failureText(error)))
  }, [box])

  useEffect(() => {
    if (!form && toy) setForm(toForm(toy))
  }, [form, toy])

  /** @param {(draft: FormState) => FormState} change */
  const update = (change) => setForm((current) => current && change(current))

  const commitAlias = () => {
    const value = newAlias?.trim()
    if (value) update((f) => (f.aliases.includes(value) ? f : { ...f, aliases: [...f.aliases, value] }))
    setNewAlias(null)
  }

  const busy = request === 'saving' || request === 'removing'

  /** @param {React.FormEvent} event */
  const save = async (event) => {
    event.preventDefault()
    if (!form || busy) return
    if (!online) {
      setFailure('Estás sin conexión.')
      return
    }
    const name = form.name.trim()
    if (!name) {
      setNameError('Falta cómo lo llaman en casa.')
      focusName()
      return
    }
    // Ask how the kid tells them apart instead of guessing which one it is.
    const twin = sameName(name, box?.toys ?? [], isNew ? null : id)
    if (twin) {
      setNameError(`Ya hay «${twin.name}» en el baúl. ¿Cómo los distinguen? Por ejemplo, el grande y el chico.`)
      update((f) => ({ ...f, linked: joining(f.linked, twin, isNew ? null : id) }))
      focusName()
      return
    }
    const aliases = newAlias?.trim() && !form.aliases.includes(newAlias.trim()) ? [...form.aliases, newAlias.trim()] : form.aliases
    /** @type {ToyChanges & { name: string }} */
    const changes = {
      name,
      aliases,
      description: form.description.trim() || null,
      ...owner(form.whose),
      favorite: form.favorite,
    }
    setRequest('saving')
    setFailure(null)
    try {
      const saved = isNew ? await addToy(changes) : await editToy(id, changes)
      if (!sameSet(isNew ? [] : (toy?.linked ?? []), form.linked)) await linkToy(saved.id, form.linked)
      goBack()
    } catch (error) {
      setFailure(failureText(error))
      setRequest('idle')
    }
  }

  const remove = async () => {
    if (!online) {
      setFailure('Estás sin conexión.')
      return
    }
    setRequest('removing')
    setFailure(null)
    try {
      await removeToy(id)
      goBack()
    } catch (error) {
      setFailure(failureText(error))
      setRequest('confirm')
    }
  }

  if (!form) {
    return (
      <Screen>
        <Header onBack={goBack} title="Juguete" />
        <Body className="page-body">
          {box ? (
            <StatusLine>Ese juguete ya no está en el baúl.</StatusLine>
          ) : (
            <>
              <Skeleton height={54} />
              <Skeleton height={54} />
            </>
          )}
          <StatusLine role="alert">{failure}</StatusLine>
        </Body>
      </Screen>
    )
  }

  const others = (box?.toys ?? []).filter((each) => each.id !== id)
  const kids = (family?.kids ?? []).filter((kid) => kid.id)

  return (
    <Screen>
      <Header onBack={goBack} title={isNew ? 'Nuevo juguete' : 'Juguete'} />
      <form className="screen-form" onSubmit={save} noValidate>
        <Body className="form-body toy-form">
          <Field
            label="Cómo lo llaman en casa"
            data-field="name"
            maxLength={120}
            {...AS_TYPED}
            error={nameError}
            value={form.name}
            onChange={(event) => {
              setNameError(null)
              const name = event.target.value
              update((f) => ({ ...f, name }))
            }}
          />

          <FieldGroup label="Otros nombres">
            <Chips
              items={form.aliases}
              onRemove={(index) => update((f) => ({ ...f, aliases: f.aliases.filter((_, i) => i !== index) }))}
            >
              <ChipInput
                value={newAlias}
                onChange={setNewAlias}
                onCommit={commitAlias}
                addLabel="Agregar otro nombre"
                inputLabel="Otro nombre"
                maxLength={120}
              />
            </Chips>
            <p className="field__help">Cómo más le dicen, como «el tuto».</p>
          </FieldGroup>

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
              Para que Juguemos sepa qué es: tipo, tamaño y material, como «T-rex de plástico duro, unos 8 cm». Nunca
              reemplaza el nombre.
            </p>
          </div>

          <FieldGroup label="De quién es">
            <Chips>
              {[...kids.map((kid) => ({ value: /** @type {string} */ (kid.id), label: kid.name })), { value: SHARED, label: 'De todos' }].map(
                (choice) => (
                  <ChipToggle
                    key={choice.value}
                    pressed={form.whose === choice.value}
                    onClick={() => update((f) => ({ ...f, whose: f.whose === choice.value ? null : choice.value }))}
                  >
                    {choice.label}
                  </ChipToggle>
                ),
              )}
              <ChipToggle pressed={form.favorite} onClick={() => update((f) => ({ ...f, favorite: !f.favorite }))}>
                Es un favorito
              </ChipToggle>
            </Chips>
          </FieldGroup>

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
                          : joining(f.linked, other, isNew ? null : id),
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

          {!isNew &&
            (request === 'confirm' || request === 'removing' ? (
              <div className="toy-form__remove" role="group" aria-labelledby="remove-label">
                <StatusLine id="remove-label">¿Lo sacamos del baúl? No se puede deshacer.</StatusLine>
                <div className="button-row">
                  <SecondaryButton
                    size="sm"
                    className="grow"
                    busy={request === 'removing'}
                    busyLabel="Sacándolo"
                    onClick={() => void remove()}
                  >
                    Sí, sacarlo
                  </SecondaryButton>
                  <TertiaryButton disabled={request === 'removing'} onClick={() => setRequest('idle')}>
                    No
                  </TertiaryButton>
                </div>
              </div>
            ) : (
              <TertiaryButton size="inline" disabled={busy} onClick={() => setRequest('confirm')}>
                Ya no lo tenemos
              </TertiaryButton>
            ))}

          <StatusLine role="alert">{failure}</StatusLine>
        </Body>
        <Footer sticky>
          <PrimaryButton type="submit" busy={request === 'saving'} busyLabel="Guardando" unavailable={!online}>
            Guardar
          </PrimaryButton>
        </Footer>
      </form>
    </Screen>
  )
}



function focusName() {
  const input = document.querySelector('[data-field="name"]')
  if (input instanceof HTMLElement) input.focus()
}

/** @param {Toy} toy @returns {FormState} */
function toForm(toy) {
  return {
    name: toy.name,
    aliases: toy.aliases,
    description: toy.description ?? '',
    whose: toy.kidId ?? (toy.shared ? SHARED : null),
    favorite: toy.favorite,
    linked: toy.linked,
  }
}

/** @param {FormState['whose']} whose @returns {{ kidId: string | null, shared: boolean }} */
function owner(whose) {
  if (whose === SHARED) return { kidId: null, shared: true }
  return { kidId: whose, shared: false }
}

/**
 * Names as they sound, only to notice two that may be the same toy: no case,
 * accents, or extra spaces. What's saved is always the name as typed.
 * @param {string} name
 */
const heard = (name) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Another toy in the box that already goes by this name, or by it as another name.
 * @param {string} name @param {Toy[]} toys @param {string | null} self
 */
function sameName(name, toys, self) {
  const wanted = heard(name)
  return toys.find((toy) => toy.id !== self && [toy.name, ...toy.aliases].some((each) => heard(each) === wanted))
}

/**
 * Adds a toy to the ones this toy goes with, along with the toys it already
 * goes with, so this toy joins that set instead of pulling the toy out of it.
 * @param {string[]} linked
 * @param {Toy} toy
 * @param {string | null} self
 */
const joining = (linked, toy, self) => [...new Set([...linked, toy.id, ...toy.linked])].filter((each) => each !== self)

/** @param {string[]} a @param {string[]} b */
const sameSet = (a, b) => a.length === b.length && a.every((each) => b.includes(each))
