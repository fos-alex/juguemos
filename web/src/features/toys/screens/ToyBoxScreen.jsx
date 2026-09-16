import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { loadToyBox, understandToys } from '../api'
import { MaterialsPicker } from '../components/MaterialsPicker'
import { ToyCandidates } from '../components/ToyCandidates'
import { ToyList } from '../components/ToyList'
import { NEW } from '../model'
import { VoiceLine, VoiceUnderstanding } from '../../voice'
import { failureText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOfflineNotice } from '../../../shared/hooks/useOfflineNotice'
import { useStored } from '../../../shared/store'
import { Body, Footer, Header, OfflineNotice, PrimaryButton, Screen, StatusLine } from '../../../shared/ui'
import '../toys.css'

/** @typedef {import('../types').ToyCandidate} ToyCandidate */

/**
 * El baúl de juguetes (JUG-94): the family's toys by their own names, and the
 * household materials they have. It was never given a design of its own: it
 * is built from the Plaza primitives, and all of its copy needs a voice pass.
 *
 * The mic beside "Agregar juguete" takes a voice note about the toys, and the
 * API reads the toys in its words (JUG-146). They come back as candidates,
 * which take over the screen until the parent confirms the ones to add or
 * leaves them; nothing is saved before that.
 */
export function ToyBoxScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const offline = useOfflineNotice()
  const box = useStored('toyBox')
  const family = useStored('family')
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  const [voiceMessage, setVoiceMessage] = useState(/** @type {import('../../voice').VoiceMessage | null} */ (null))
  // The toys heard in the last note, waiting to be confirmed.
  const [heard, setHeard] = useState(/** @type {ToyCandidate[] | null} */ (null))

  useDocumentTitle('El baúl de juguetes · Ludi')

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

  /** @param {string} text the words of a voice note about the toys */
  const readNote = async (text) => {
    setFailure(null)
    setHeard(await understandToys(text))
  }

  if (heard) {
    return (
      <Screen>
        <Header onBack={() => setHeard(null)} title="¿Los agrego?" />
        <ToyCandidates candidates={heard} box={box} onDone={() => setHeard(null)} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Header onBack={goBack} title="El baúl de juguetes" />
      <Body className="page-body toy-box">
        <OfflineNotice notice={offline} />
        <ToyList box={box} kids={family?.kids ?? []} onOpen={open} />
        {box && <MaterialsPicker materials={box.materials} offline={offline} onFailure={setFailure} />}
        <StatusLine role="alert">{failure}</StatusLine>
        <VoiceLine message={voiceMessage} />
      </Body>
      <Footer row className="toy-box__voice">
        <VoiceUnderstanding read={readNote} onMessage={setVoiceMessage}>
          <PrimaryButton className="grow" unavailable={!offline.online} onClick={add}>
            Agregar juguete
          </PrimaryButton>
        </VoiceUnderstanding>
      </Footer>
    </Screen>
  )
}
