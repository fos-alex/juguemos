import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { chooseMaterials, loadToyBox } from '../../../api'
import { PrimaryButton } from '../../../shared/ui/Buttons'
import { Card, Skeleton } from '../../../shared/ui/Card'
import { Chips, ChipToggle } from '../../../shared/ui/Chips'
import { FieldGroup } from '../../../shared/ui/Field'
import { OfflineNotice } from '../../../shared/ui/OfflineNotice'
import { Body, Footer, Header, Screen } from '../../../shared/ui/Screen'
import { StatusLine } from '../../../shared/ui/StatusLine'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOfflineNotice } from '../../../shared/hooks/useOfflineNotice'
import { useSerialSaves } from '../../../shared/hooks/useSerialSaves'
import { failureText } from '../../../shared/format'
import { useStored, write } from '../../../shared/store'

export const Route = createFileRoute('/juguetes/')({
  component: ToyBoxScreen,
})

/** @typedef {import('../../../api/types').Toy} Toy */
/** @typedef {import('../../../api/types').Material} Material */
/** @typedef {import('../../../api/types').ToyBox} ToyBox */
/** @typedef {import('../../family').Kid} Kid */

/**
 * El baúl de juguetes (JUG-94): the family's toys by their own names, and the
 * household materials they have. The 0.2 design (JUG-84) doesn't exist yet,
 * so this is built from the Plaza primitives; restyle it when the handoff
 * lands. All of its copy needs a voice pass.
 */
function ToyBoxScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const offline = useOfflineNotice()
  const { online } = offline
  const box = useStored('toyBox')
  const family = useStored('family')
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  
  // Materials are saved one tap after another, like who's playing on Home.
  const saves = useSerialSaves()

  useEffect(() => {
    document.title = 'El baúl de juguetes · Juguemos'
    // Another phone may have changed the box.
    if (navigator.onLine) loadToyBox().catch((error) => setFailure(failureText(error)))
  }, [])

  /** @param {Material} material */
  const toggleMaterial = (material) => {
    if (!box) return
    if (!online) return offline.tap()
    const materials = box.materials.map((each) => (each.key === material.key ? { ...each, have: !each.have } : each))
    write('toyBox', { ...box, materials })
    setFailure(null)
    const keys = materials.filter((each) => each.have).map((each) => each.key)
    saves.add(
      () => chooseMaterials(keys),
      (error) => {
        setFailure(failureText(error))
        return loadToyBox().catch(() => {})
      },
    )
  }

  const add = () => {
    if (!online) offline.tap()
    else void navigate({ to: '/juguetes/$id', params: { id: 'nuevo' } })
  }

  return (
    <Screen>
      <Header onBack={goBack} title="El baúl de juguetes" />
      <Body className="page-body toy-box">
        <OfflineNotice notice={offline} />

        {!box ? (
          <div className="toy-list" aria-hidden="true">
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </div>
        ) : box.toys.length === 0 ? (
          <StatusLine>Todavía no hay juguetes en el baúl.</StatusLine>
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
          <FieldGroup label="También hay en casa" className="toy-box__materials">
            <Chips>
              {box.materials.map((material) => (
                <ChipToggle key={material.key} pressed={material.have} onClick={() => toggleMaterial(material)}>
                  {material.label}
                </ChipToggle>
              ))}
            </Chips>
          </FieldGroup>
        )}

        <StatusLine role="alert">{failure}</StatusLine>
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
