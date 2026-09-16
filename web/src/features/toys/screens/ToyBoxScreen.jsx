import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { loadToyBox } from '../api'
import { MaterialsPicker } from '../components/MaterialsPicker'
import { ToyList } from '../components/ToyList'
import { NEW } from '../model'
import { failureText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOfflineNotice } from '../../../shared/hooks/useOfflineNotice'
import { useStored } from '../../../shared/store'
import { Body, Footer, Header, OfflineNotice, PrimaryButton, Screen, StatusLine } from '../../../shared/ui'
import '../toys.css'

/**
 * El baúl de juguetes (JUG-94): the family's toys by their own names, and the
 * household materials they have. The 0.2 design (JUG-84) doesn't exist yet,
 * so this is built from the Plaza primitives; restyle it when the design
 * lands. All of its copy needs a voice pass.
 */
export function ToyBoxScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const offline = useOfflineNotice()
  const box = useStored('toyBox')
  const family = useStored('family')
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useDocumentTitle('El baúl de juguetes · Juguemos')

  useEffect(() => {
    // Another phone may have changed the box.
    if (navigator.onLine) loadToyBox().catch((error) => setFailure(failureText(error)))
  }, [])

  /** @param {string} id */
  const open = (id) => void navigate({ to: '/juguetes/$id', params: { id } })

  const add = () => {
    if (!offline.online) offline.tap()
    else open(NEW)
  }

  return (
    <Screen>
      <Header onBack={goBack} title="El baúl de juguetes" />
      <Body className="page-body toy-box">
        <OfflineNotice notice={offline} />
        <ToyList box={box} kids={family?.kids ?? []} onOpen={open} />
        {box && <MaterialsPicker materials={box.materials} offline={offline} onFailure={setFailure} />}
        <StatusLine role="alert">{failure}</StatusLine>
      </Body>
      <Footer>
        <PrimaryButton unavailable={!offline.online} onClick={add}>
          Agregar juguete
        </PrimaryButton>
      </Footer>
    </Screen>
  )
}
