import { useState } from 'react'
import { requestRows } from '../model'
import { VoiceLine, VoiceUnderstanding } from '../../voice'
import { useOnline } from '../../../shared/hooks/useOnline'
import { Body, Footer, MetaLabel, PrimaryButton, StatusLine } from '../../../shared/ui'
import '../stories.css'

/** @typedef {import('../types').StoryRequest} StoryRequest */

/**
 * The story Ludi heard in a voice note (JUG-156), for the parent to see before
 * it is written: one line saying what story it is, then who is in it, where it
 * happens, its theme, and what happens, each only when the note said it. The
 * parent writes it, or holds the mic again to ask for another one, which
 * replaces this one. It takes the screen's body and its footer, like the toys
 * a note brings to the baúl. All of its copy needs a voice pass.
 * @param {{
 *   request: StoryRequest,
 *   read: (text: string) => Promise<void>,
 *   onWrite: () => void,
 * }} props `read` reads a new note's words into the next request
 */
export function StoryRequestReview({ request, read, onWrite }) {
  const online = useOnline()
  const [notice, setNotice] = useState(/** @type {string | null} */ (null))
  const [voiceMessage, setVoiceMessage] = useState(/** @type {import('../../voice').VoiceMessage | null} */ (null))

  const write = () => {
    if (!online) {
      setNotice('Estás sin conexión.')
      return
    }
    onWrite()
  }

  return (
    <>
      <Body className="page-body story-request">
        <p className="story-request__intro">Esto escuché. Si no es así, contámelo de nuevo.</p>
        <div className="card story-request__card">
          <p className="story-request__summary">{request.summary}</p>
          {requestRows(request).map((row) => (
            <div key={row.label} className="story-request__row">
              <MetaLabel as="span" wide>
                {row.label}
              </MetaLabel>
              <span className="story-request__value">{row.value}</span>
            </div>
          ))}
        </div>
        <StatusLine role="alert">{notice}</StatusLine>
        <VoiceLine message={voiceMessage} />
      </Body>
      <Footer row className="story-request__footer">
        <VoiceUnderstanding read={read} onMessage={setVoiceMessage}>
          <PrimaryButton className="grow" unavailable={!online} onClick={write}>
            Escribir este cuento
          </PrimaryButton>
        </VoiceUnderstanding>
      </Footer>
    </>
  )
}
