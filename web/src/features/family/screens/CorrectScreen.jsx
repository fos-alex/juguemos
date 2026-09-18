import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { saveFamily, understandChanges } from '../api'
import { HomeChoice } from '../components/HomeChoice'
import { KidCards } from '../components/KidCards'
import { LocationField } from '../components/LocationField'
import { ParentCards } from '../components/ParentCards'
import { PetField } from '../components/PetField'
import { ToyRows } from '../components/ToyRows'
import { toFamily, toForm, withChanges } from '../model'
import { VoiceLine, VoiceUnderstanding } from '../../voice'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useRequest } from '../../../shared/hooks/useRequest'
import { read } from '../../../shared/store'
import { Body, Footer, Header, PrimaryButton, Screen, StatusLine } from '../../../shared/ui'
import '../family.css'

/** @typedef {import('../model').FormState} FormState */

// Voice pass pending.
const HEARD = 'Lo anoté acá arriba. Revisalo y tocá Guardar.'

/**
 * 2h. The fallback, and it looks like a plain form: a card for each parent
 * with their name and what the kids call them, a card for each kid with
 * their name, age, and what they love (JUG-144, JUG-152), then the pet and
 * its animal, the kind of home (JUG-21), and where they live (JUG-25).
 * Everything is optional. Reached
 * from "Corregir", a flagged row (focused on that field), the opt-out in 2d,
 * and Mi familia.
 *
 * The toys are here only in onboarding, where the card that led here saves
 * them. Once there is a family they live in the toy box, and saving this
 * form leaves them as they are.
 *
 * The mic beside "Guardar" is how the parent says what changed (JUG-103): the
 * note's words go to the API, which reads a family in them, and what it read
 * is folded into the form. Nothing is taken away by not being named in the
 * note, and nothing is saved until "Guardar", so this form is where the
 * parent checks the change, the way the card is after onboarding.
 */
export function CorrectScreen() {
  const { campo } = useSearch({ from: '/familia/corregir' })
  const navigate = useNavigate()
  const [onboarding] = useState(() => !read('family'))
  // Where the family last saved, so the field can say when Ludi couldn't find it (JUG-25).
  const [savedLocation] = useState(() => read('family')?.location ?? null)
  const goBack = useGoBack(onboarding ? '/familia/contanos' : '/familia')
  const [form, setForm] = useState(() => toForm(read('parseResult')?.family ?? read('family'), { toys: onboarding }))
  // The interest being typed for each kid, by the kid's position.
  const [drafts, setDrafts] = useState(/** @type {Record<number, string | null>} */ ({}))
  const request = useRequest()
  const [voiceMessage, setVoiceMessage] = useState(/** @type {import('../../voice').VoiceMessage | null} */ (null))

  useDocumentTitle('Editar · Ludi')

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

  /**
   * Takes a kid off the form. Tapping "Quitar" blurs any interest being typed,
   * which adds it first, so no draft is left to follow the kids that move up.
   * @param {number} index
   */
  const removeKid = (index) => {
    update((f) => ({ ...f, kids: f.kids.filter((_, i) => i !== index) }))
    setDrafts({})
  }

  /** @param {string} text the words of a voice note about what changed */
  const readNote = async (text) => {
    const said = await understandChanges(text)
    update((f) => withChanges(f, said))
    setVoiceMessage({ text: HEARD })
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
          <ParentCards parents={form.parents} onChange={(change) => update((f) => ({ ...f, parents: change(f.parents) }))} />

          <KidCards
            kids={form.kids}
            drafts={drafts}
            onDraft={(index, draft) => setDrafts((all) => ({ ...all, [index]: draft }))}
            onChange={(change) => update((f) => ({ ...f, kids: change(f.kids) }))}
            onRemove={removeKid}
          />

          <PetField
            name={form.pet}
            kind={form.petKind}
            onName={(pet) => update((f) => ({ ...f, pet }))}
            onKind={(petKind) => update((f) => ({ ...f, petKind }))}
          />

          <HomeChoice home={form.home} onChange={(home) => update((f) => ({ ...f, home }))} />

          <LocationField
            location={form.location}
            saved={savedLocation}
            onChange={(location) => update((f) => ({ ...f, location }))}
          />

          {form.toys && (
            <ToyRows
              toys={form.toys}
              onChange={(change) => update((f) => ({ ...f, toys: f.toys && change(f.toys) }))}
            />
          )}

          <StatusLine role="alert">{request.failure}</StatusLine>
          <VoiceLine message={voiceMessage} />
          {/* Voice pass pending. */}
          <p className="correct__voice-help">Contame qué cambió y lo anoto acá.</p>
        </Body>
        <Footer row sticky>
          <VoiceUnderstanding read={readNote} onMessage={setVoiceMessage}>
            {/* Voice pass pending: "Guardar". */}
            <PrimaryButton className="grow" type="submit" busy={request.busy} busyLabel="Guardando">
              Guardar
            </PrimaryButton>
          </VoiceUnderstanding>
        </Footer>
      </form>
    </Screen>
  )
}
