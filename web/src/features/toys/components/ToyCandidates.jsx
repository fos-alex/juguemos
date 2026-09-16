import { useState } from 'react'
import { addToy } from '../api'
import { sameName } from '../model'
import { useOnline } from '../../../shared/hooks/useOnline'
import { useRequest } from '../../../shared/hooks/useRequest'
import { Body, Card, Footer, PrimaryButton, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../toys.css'

/** @typedef {import('../types').ToyBox} ToyBox */
/** @typedef {import('../types').ToyCandidate} ToyCandidate */

/**
 * The toys Juguemos heard in a voice note, for the parent to confirm before
 * any of them is saved (JUG-146). Every one starts chosen, except one the box
 * already has by that name, which says so and starts out of the list, so a
 * toy isn't added twice without the parent meaning it. A tap takes a toy in
 * or out, and "Agregar" saves the chosen ones in order, each one leaving the
 * list as it is saved, so a failure halfway through can be tried again
 * without adding anything twice.
 *
 * It takes the baúl's body and its footer, since the note is what the screen
 * is about until the parent is done with it. All of its copy needs a voice
 * pass.
 * @param {{ candidates: ToyCandidate[], box: ToyBox | null, onDone: () => void }} props
 */
export function ToyCandidates({ candidates, box, onDone }) {
  const online = useOnline()
  const request = useRequest()
  const [rows, setRows] = useState(() =>
    candidates.map((candidate, index) => {
      const known = Boolean(sameName(candidate.name, box?.toys ?? [], null))
      return { ...candidate, key: index, known, chosen: !known }
    }),
  )

  const chosen = rows.filter((row) => row.chosen)

  /** @param {number} key */
  const toggle = (key) => setRows((all) => all.map((row) => (row.key === key ? { ...row, chosen: !row.chosen } : row)))

  const add = () => {
    if (request.busy) return
    if (!online) return request.fail('Estás sin conexión.')
    void request.run(async () => {
      for (const row of chosen) {
        await addToy({ name: row.name, description: row.description })
        setRows((all) => all.filter((each) => each.key !== row.key))
      }
      onDone()
    })
  }

  return (
    <>
      <Body className="page-body toy-box">
        <p className="toy-candidates__intro">Esto escuché. Tocá el que no va para dejarlo afuera.</p>
        <ul className="toy-list">
          {rows.map((row) => (
            <li key={row.key}>
              <Card
                className={`toy-candidate${row.chosen ? ' is-chosen' : ''}`}
                pressed={row.chosen}
                onClick={() => toggle(row.key)}
              >
                <span className="toy-candidate__mark" aria-hidden="true">
                  {row.chosen ? '✓' : '+'}
                </span>
                <span className="card-title">{row.name}</span>
                {row.description && <span className="card-meta">{row.description}</span>}
                {row.known && <span className="card-meta">Ya hay uno con ese nombre en el baúl.</span>}
              </Card>
            </li>
          ))}
        </ul>
        <StatusLine role="alert">{request.failure}</StatusLine>
      </Body>
      <Footer>
        <PrimaryButton
          busy={request.busy}
          busyLabel="Guardando"
          disabled={chosen.length === 0}
          unavailable={!online}
          onClick={add}
        >
          {chosen.length > 1 ? `Agregar los ${chosen.length}` : 'Agregar al baúl'}
        </PrimaryButton>
        <TertiaryButton disabled={request.busy} onClick={onDone}>
          Ahora no
        </TertiaryButton>
      </Footer>
    </>
  )
}
