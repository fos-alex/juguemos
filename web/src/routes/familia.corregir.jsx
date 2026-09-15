import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { saveFamily } from '../api'
import { PrimaryButton } from '../shared/ui/Buttons'
import { ChipInput, Chips } from '../shared/ui/Chips'
import { AS_TYPED, Field, FieldControl, FieldGroup } from '../shared/ui/Field'
import { Body, Footer, Header, Screen } from '../shared/ui/Screen'
import { useGoBack } from '../shared/hooks/useGoBack'
import { failureText } from '../shared/format'
import { read } from '../shared/store'
import { StatusLine } from '../shared/ui/StatusLine'

/** @typedef {import('../api/types').Family} Family */
/**
 * @typedef {{
 *   kids: { id?: string, name: string, age: string }[], pet: string, interests: string[],
 *   toys: import('../api/types').FamilyToy[],
 * }} FormState
 */

export const Route = createFileRoute('/familia/corregir')({
  validateSearch: (search) => ({
    campo: typeof search.campo === 'string' ? search.campo : undefined,
  }),
  component: CorrectScreen,
})



/**
 * 2h. The fallback, and it looks like a plain form: the same four groups in
 * the same order as the card. Everything is optional. Reached from
 * "Corregir", a flagged row (focused on that field), the opt-out in 2d, and
 * Mi familia.
 */
function CorrectScreen() {
  const { campo } = Route.useSearch()
  const navigate = useNavigate()
  const [onboarding] = useState(() => !read('family'))
  const goBack = useGoBack(onboarding ? '/familia/contanos' : '/familia')
  const [form, setForm] = useState(() => toForm(read('parseResult')?.family ?? read('family')))
  const [newInterest, setNewInterest] = useState(/** @type {string | null} */ (null))
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    document.title = 'Corregir · Juguemos'
  }, [])

  useEffect(() => {
    if (!campo) return
    const target = document.querySelector(`[data-field="${CSS.escape(campo)}"]`)
    if (target instanceof HTMLElement) {
      target.focus()
      target.scrollIntoView({ block: 'center' })
    }
  }, [campo])

  /** @param {(draft: FormState) => FormState} change */
  const update = (change) => setForm((current) => change(current))

  const commitInterest = () => {
    const value = newInterest?.trim()
    if (value) update((f) => ({ ...f, interests: [...f.interests, value] }))
    setNewInterest(null)
  }

  /** @param {React.FormEvent} event */
  const save = async (event) => {
    event.preventDefault()
    if (busy) return
    const interests = newInterest?.trim() ? [...form.interests, newInterest.trim()] : form.interests
    setBusy(true)
    setFailure(null)
    try {
      await saveFamily(toFamily({ ...form, interests }))
      void navigate({ to: onboarding ? '/' : '/familia', replace: true })
    } catch (error) {
      setFailure(failureText(error))
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Header onBack={goBack} title="Corregir" />
      <form className="screen-form" onSubmit={save} noValidate>
        <Body className="form-body correct">
          <FieldGroup label="Chicos">
            <div className="kid-rows">
              {form.kids.map((kid, index) => (
                <div key={index} className="kid-row">
                  <FieldControl
                    className="kid-row__name"
                    aria-label={`Nombre ${index + 1}`}
                    data-field={`kids.${index}`}
                    autoCapitalize="words"
                    autoCorrect="off"
                    value={kid.name}
                    onChange={(event) =>
                      update((f) => ({ ...f, kids: f.kids.map((k, i) => (i === index ? { ...k, name: event.target.value } : k)) }))
                    }
                  />
                  <FieldControl
                    className="kid-row__age"
                    aria-label={`Edad ${index + 1}, en años`}
                    inputMode="numeric"
                    maxLength={2}
                    suffix={kid.age === '1' ? 'año' : 'años'}
                    value={kid.age}
                    onChange={(event) => {
                      const age = event.target.value.replace(/\D/g, '')
                      update((f) => ({ ...f, kids: f.kids.map((k, i) => (i === index ? { ...k, age } : k)) }))
                    }}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="add-link"
              onClick={() => update((f) => ({ ...f, kids: [...f.kids, { name: '', age: '' }] }))}
            >
              + agregar otro chico
            </button>
          </FieldGroup>

          <Field
            label="Mascota"
            data-field="pet"
            autoCapitalize="words"
            autoCorrect="off"
            value={form.pet}
            onChange={(event) => update((f) => ({ ...f, pet: event.target.value }))}
          />

          <FieldGroup label="Le encanta">
            <Chips
              items={form.interests}
              onRemove={(index) => update((f) => ({ ...f, interests: f.interests.filter((_, i) => i !== index) }))}
            >
              <ChipInput
                value={newInterest}
                onChange={setNewInterest}
                onCommit={commitInterest}
                field="interests"
                addLabel="Agregar algo que le encanta"
                inputLabel="Algo que le encanta"
              />
            </Chips>
          </FieldGroup>

          <FieldGroup label="Juguetes · como los llaman en casa">
            <div className="toy-rows">
              {form.toys.map((toy, index) => (
                <FieldControl
                  key={index}
                  aria-label={`Juguete ${index + 1}`}
                  data-field={index === 0 ? 'toys' : undefined}
                  {...AS_TYPED}
                  value={toy.name}
                  onChange={(event) =>
                    update((f) => ({ ...f, toys: f.toys.map((t, i) => (i === index ? { ...t, name: event.target.value } : t)) }))
                  }
                />
              ))}
            </div>
            <button
              type="button"
              className="add-link"
              onClick={() => update((f) => ({ ...f, toys: [...f.toys, { name: '' }] }))}
            >
              + agregar juguete
            </button>
          </FieldGroup>

          <StatusLine role="alert">{failure}</StatusLine>
        </Body>
        <Footer sticky>
          {/* Voice pass pending: "Guardar". */}
          <PrimaryButton type="submit" busy={busy} busyLabel="Guardando">
            Guardar
          </PrimaryButton>
        </Footer>
      </form>
    </Screen>
  )
}

/** @param {Family | null | undefined} family @returns {FormState} */
function toForm(family) {
  const kids = family?.kids.map((kid) => ({ id: kid.id, name: kid.name, age: kid.age == null ? '' : String(kid.age) })) ?? []
  return {
    kids: kids.length > 0 ? kids : [{ name: '', age: '' }],
    pet: family?.pet ?? '',
    interests: family?.interests ?? [],
    toys: family?.toys.length ? family.toys : [{ name: '' }],
  }
}

/** Drops what was left empty; never touches how a name is spelled. @param {FormState} form @returns {Family} */
function toFamily(form) {
  return {
    kids: form.kids
      .filter((kid) => kid.name.trim())
      .map((kid) => ({ id: kid.id, name: kid.name.trim(), age: kid.age ? Number(kid.age) : null })),
    pet: form.pet.trim(),
    interests: form.interests,
    // Each toy keeps its id, so the toy box keeps what it knows about it.
    toys: form.toys.map((toy) => ({ id: toy.id, name: toy.name.trim() })).filter((toy) => toy.name),
  }
}
