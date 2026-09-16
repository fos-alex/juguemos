import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { saveFamily } from '../api'
import { InterestChips } from '../components/InterestChips'
import { KidRows } from '../components/KidRows'
import { ToyRows } from '../components/ToyRows'
import { toFamily, toForm } from '../model'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useRequest } from '../../../shared/hooks/useRequest'
import { read } from '../../../shared/store'
import { Body, Field, Footer, Header, PrimaryButton, Screen, StatusLine } from '../../../shared/ui'
import '../family.css'

/** @typedef {import('../model').FormState} FormState */

/**
 * Whose interests a chip group holds. With one kid it's just "Le encanta".
 * @param {FormState['kids'][number]} kid @param {number} index @param {number} count
 */
function interestsLabel(kid, index, count) {
  if (count === 1) return 'Le encanta'
  const name = kid.name.trim()
  return name ? `A ${name} le encanta` : `Le encanta · chico ${index + 1}`
}

/**
 * 2h. The fallback, and it looks like a plain form: the same groups in the
 * same order as the card, with what each kid loves in its own group
 * (JUG-144). Everything is optional. Reached from "Corregir", a flagged row
 * (focused on that field), the opt-out in 2d, and Mi familia.
 */
export function CorrectScreen() {
  const { campo } = useSearch({ from: '/familia/corregir' })
  const navigate = useNavigate()
  const [onboarding] = useState(() => !read('family'))
  const goBack = useGoBack(onboarding ? '/familia/contanos' : '/familia')
  const [form, setForm] = useState(() => toForm(read('parseResult')?.family ?? read('family')))
  // The interest being typed for each kid, by the kid's row.
  const [drafts, setDrafts] = useState(/** @type {Record<number, string | null>} */ ({}))
  const request = useRequest()

  useDocumentTitle('Editar · Juguemos')

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

  /** @param {number} index @param {(interests: string[]) => string[]} change */
  const changeInterests = (index, change) =>
    update((f) => ({ ...f, kids: f.kids.map((kid, i) => (i === index ? { ...kid, interests: change(kid.interests) } : kid)) }))

  /** @param {number} index */
  const commitInterest = (index) => {
    const value = drafts[index]?.trim()
    if (value) changeInterests(index, (interests) => [...interests, value])
    setDrafts((all) => ({ ...all, [index]: null }))
  }

  /** @param {React.FormEvent} event */
  const save = (event) => {
    event.preventDefault()
    if (request.busy) return
    // An interest still being typed is saved with the rest.
    const kids = form.kids.map((kid, index) => {
      const typed = drafts[index]?.trim()
      return typed ? { ...kid, interests: [...kid.interests, typed] } : kid
    })
    void request.run(async () => {
      await saveFamily(toFamily({ ...form, kids }))
      void navigate({ to: onboarding ? '/' : '/familia', replace: true })
    })
  }

  return (
    <Screen>
      <Header onBack={goBack} title="Editar" />
      <form className="screen-form" onSubmit={save} noValidate>
        <Body className="form-body correct">
          <KidRows kids={form.kids} onChange={(change) => update((f) => ({ ...f, kids: change(f.kids) }))} />

          <Field
            label="Mascota"
            data-field="pet"
            autoCapitalize="words"
            autoCorrect="off"
            value={form.pet}
            onChange={(event) => update((f) => ({ ...f, pet: event.target.value }))}
          />

          {form.kids.map((kid, index) => (
            <InterestChips
              key={index}
              label={interestsLabel(kid, index, form.kids.length)}
              field={`interests.${index}`}
              interests={kid.interests}
              draft={drafts[index] ?? null}
              onDraft={(draft) => setDrafts((all) => ({ ...all, [index]: draft }))}
              onCommit={() => commitInterest(index)}
              onRemove={(position) => changeInterests(index, (interests) => interests.filter((_, i) => i !== position))}
            />
          ))}

          <ToyRows toys={form.toys} onChange={(change) => update((f) => ({ ...f, toys: change(f.toys) }))} />

          <StatusLine role="alert">{request.failure}</StatusLine>
        </Body>
        <Footer sticky>
          {/* Voice pass pending: "Guardar". */}
          <PrimaryButton type="submit" busy={request.busy} busyLabel="Guardando">
            Guardar
          </PrimaryButton>
        </Footer>
      </form>
    </Screen>
  )
}
