import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { chooseMaterials, loadToyBox } from '../api'
import { PrimaryButton } from '../shared/ui/Buttons'
import { Card, Skeleton } from '../shared/ui/Card'
import { Body, Footer, Header, Screen } from '../shared/ui/Screen'
import { useGoBack } from '../shared/hooks/useGoBack'
import { useOnline } from '../shared/hooks/useOnline'
import { failureText } from '../shared/format'
import { useStored, write } from '../shared/store'

export const Route = createFileRoute('/juguetes/')({
  component: ToyBoxScreen,
})

/** @typedef {import('../api/types').Toy} Toy */
/** @typedef {import('../api/types').Material} Material */
/** @typedef {import('../api/types').ToyBox} ToyBox */
/** @typedef {import('../api/types').Kid} Kid */

/**
 * El baúl de juguetes (JUG-94): the family's toys by their own names, and the
 * household materials they have. The 0.2 design (JUG-84) doesn't exist yet,
 * so this is built from the Plaza primitives; restyle it when the handoff
 * lands. All of its copy needs a voice pass.
 */
function ToyBoxScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const online = useOnline()
  const box = useStored('toyBox')
  const family = useStored('family')
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  const [offlineTaps, setOfflineTaps] = useState(0)
  // Materials are saved one tap after another, like who's playing on Home.
  const choosing = useRef(/** @type {Promise<unknown>} */ (Promise.resolve()))

  useEffect(() => {
    document.title = 'El baúl de juguetes · Juguemos'
    // Another phone may have changed the box.
    if (navigator.onLine) loadToyBox().catch((error) => setFailure(failureText(error)))
  }, [])

  /** @param {Material} material */
  const toggleMaterial = (material) => {
    if (!box) return
    if (!online) {
      setOfflineTaps((taps) => taps + 1)
      return
    }
    const materials = box.materials.map((each) => (each.key === material.key ? { ...each, have: !each.have } : each))
    write('toyBox', { ...box, materials })
    setFailure(null)
    const keys = materials.filter((each) => each.have).map((each) => each.key)
    choosing.current = choosing.current
      .then(() => chooseMaterials(keys))
      .catch((error) => {
        setFailure(failureText(error))
        return loadToyBox().catch(() => {})
      })
  }

  const add = () => {
    if (!online) setOfflineTaps((taps) => taps + 1)
    else void navigate({ to: '/juguetes/$id', params: { id: 'nuevo' } })
  }

  return (
    <Screen>
      <Header onBack={goBack} title="El baúl de juguetes" />
      <Body className="page-body toy-box">
        {!online && (
          <p key={offlineTaps} className="status-line" role="status">
            Estás sin conexión.
          </p>
        )}

        {!box ? (
          <div className="toy-list" aria-hidden="true">
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </div>
        ) : box.toys.length === 0 ? (
          <p className="status-line">Todavía no hay juguetes en el baúl.</p>
        ) : (
          <ul className="toy-list">
            {box.toys.map((toy) => {
              const line = toyLine(toy, box, family?.kids ?? [])
              return (
                <li key={toy.id}>
                  <Card onClick={() => void navigate({ to: '/juguetes/$id', params: { id: toy.id } })}>
                    <span className="card-title">{toy.name}</span>
                    {line && <span className="card-meta">{line}</span>}
                  </Card>
                </li>
              )
            })}
          </ul>
        )}

        {box && box.materials.length > 0 && (
          <div className="field toy-box__materials" role="group" aria-labelledby="materials-label">
            <p id="materials-label" className="field__label">
              También hay en casa
            </p>
            <div className="chips">
              {box.materials.map((material) => (
                <button
                  key={material.key}
                  type="button"
                  className="chip chip--toggle"
                  aria-pressed={material.have}
                  onClick={() => toggleMaterial(material)}
                >
                  {material.have && (
                    <span className="chip__check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {material.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {failure && (
          <p className="status-line" role="alert">
            {failure}
          </p>
        )}
      </Body>
      <Footer>
        <PrimaryButton unavailable={!online} onClick={add}>
          Agregar juguete
        </PrimaryButton>
      </Footer>
    </Screen>
  )
}

/**
 * The rest of what the box knows about a toy, in words: whose it is, whether
 * it's a favorite, and the toys it goes with, by their family names. The
 * description stays on the toy's own screen.
 * @param {Toy} toy
 * @param {ToyBox} box
 * @param {Kid[]} kids
 */
function toyLine(toy, box, kids) {
  const parts = []
  const kid = kids.find((each) => each.id === toy.kidId)
  if (kid) parts.push(`de ${kid.name}`)
  else if (toy.shared) parts.push('de todos')
  if (toy.favorite) parts.push('favorito')
  const linked = toy.linked.map((id) => box.toys.find((other) => other.id === id)?.name).filter(Boolean)
  if (linked.length > 0) parts.push(`va con ${linked.join(' y ')}`)
  return parts.join(' · ')
}
