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
 * 2h. The fallback, and it looks like a plain form: the same four groups in
 * the same order as the card. Everything is optional. Reached from
 * "Corregir", a flagged row (focused on that field), the opt-out in 2d, and
 * Mi familia.
 */
export function CorrectScreen() {
  const { campo } = useSearch({ from: '/familia/corregir' })
  const navigate = useNavigate()
  const [onboarding] = useState(() => !read('family'))
  const goBack = useGoBack(onboarding ? '/familia/contanos' : '/familia')
  const [form, setForm] = useState(() => toForm(read('parseResult')?.family ?? read('family')))
  const [newInterest, setNewInterest] = useState(/** @type {string | null} */ (null))
  const request = useRequest()

  useDocumentTitle('Corregir · Juguemos')

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
  const save = (event) => {
    event.preventDefault()
    if (request.busy) return
    const interests = newInterest?.trim() ? [...form.interests, newInterest.trim()] : form.interests
    void request.run(async () => {
      await saveFamily(toFamily({ ...form, interests }))
      void navigate({ to: onboarding ? '/' : '/familia', replace: true })
    })
  }

  return (
    <Screen>
      <Header onBack={goBack} title="Corregir" />
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

          <InterestChips
            interests={form.interests}
            draft={newInterest}
            onDraft={setNewInterest}
            onCommit={commitInterest}
            onRemove={(index) => update((f) => ({ ...f, interests: f.interests.filter((_, i) => i !== index) }))}
          />

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
