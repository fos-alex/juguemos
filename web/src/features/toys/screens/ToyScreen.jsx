import { useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { addToy, editToy, linkToy, loadToyBox, removeToy } from '../api'
import { RemoveToy } from '../components/RemoveToy'
import { ToyForm } from '../components/ToyForm'
import { EMPTY, joining, NEW, owner, sameName, sameSet, toForm } from '../model'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOnline } from '../../../shared/hooks/useOnline'
import { useRequest } from '../../../shared/hooks/useRequest'
import { useStored } from '../../../shared/store'
import { Body, Footer, Header, PrimaryButton, Screen, Skeleton, StatusLine } from '../../../shared/ui'
import '../toys.css'

/** @typedef {import('../types').ToyChanges} ToyChanges */
/** @typedef {import('../model').FormState} FormState */

/**
 * One toy in the toy box, or a new one at /juguetes/nuevo: its family name,
 * other names, what it is (for Juguemos, never shown in place of the name),
 * whose it is, favorite, and the toys it goes with. Built before the 0.2
 * design (JUG-84); all of its copy needs a voice pass.
 */
export function ToyScreen() {
  const { id } = useParams({ from: '/juguetes/$id' })
  const isNew = id === NEW
  const goBack = useGoBack('/juguetes')
  const online = useOnline()
  const box = useStored('toyBox')
  const family = useStored('family')
  const toy = box?.toys.find((each) => each.id === id)
  const [form, setForm] = useState(/** @type {FormState | null} */ (isNew ? EMPTY : toy ? toForm(toy) : null))
  const [newAlias, setNewAlias] = useState(/** @type {string | null} */ (null))
  const [nameError, setNameError] = useState(/** @type {string | null} */ (null))
  // One request at a time: saving the toy, or taking it out once the parent confirms.
  const request = useRequest()
  const [action, setAction] = useState(/** @type {'save' | 'remove'} */ ('save'))
  const [confirming, setConfirming] = useState(false)

  useDocumentTitle(`${isNew ? 'Nuevo juguete' : 'Juguete'} · Juguemos`)

  // Opened straight from a link, before this device has the box.
  useEffect(() => {
    if (!box && navigator.onLine) loadToyBox().catch((error) => request.fail(error))
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

  /** @param {React.FormEvent} event */
  const save = (event) => {
    event.preventDefault()
    if (!form || request.busy) return
    if (!online) return request.fail('Estás sin conexión.')
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
    setConfirming(false)
    setAction('save')
    void request.run(async () => {
      const saved = isNew ? await addToy(changes) : await editToy(id, changes)
      if (!sameSet(isNew ? [] : (toy?.linked ?? []), form.linked)) await linkToy(saved.id, form.linked)
      goBack()
    })
  }

  const remove = () => {
    if (!online) return request.fail('Estás sin conexión.')
    setAction('remove')
    void request.run(async () => {
      await removeToy(id)
      goBack()
    })
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
          <StatusLine role="alert">{request.failure}</StatusLine>
        </Body>
      </Screen>
    )
  }

  return (
    <Screen>
      <Header onBack={goBack} title={isNew ? 'Nuevo juguete' : 'Juguete'} />
      <form className="screen-form" onSubmit={save} noValidate>
        <Body className="form-body toy-form">
          <ToyForm
            form={form}
            update={update}
            nameError={nameError}
            onNameEdit={() => setNameError(null)}
            alias={{ draft: newAlias, onDraft: setNewAlias, onCommit: commitAlias }}
            kids={(family?.kids ?? []).filter((kid) => kid.id)}
            others={(box?.toys ?? []).filter((each) => each.id !== id)}
            self={isNew ? null : id}
          />
          {!isNew && (
            <RemoveToy
              confirming={confirming}
              removing={request.busy && action === 'remove'}
              disabled={request.busy}
              onAsk={() => setConfirming(true)}
              onCancel={() => setConfirming(false)}
              onRemove={remove}
            />
          )}
          <StatusLine role="alert">{request.failure}</StatusLine>
        </Body>
        <Footer sticky>
          <PrimaryButton
            type="submit"
            busy={request.busy && action === 'save'}
            busyLabel="Guardando"
            unavailable={!online}
          >
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
