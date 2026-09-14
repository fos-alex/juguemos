import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PrimaryButton, TertiaryButton } from '../components/Buttons'
import { Body, Footer, Screen } from '../components/Screen'
import { VoiceNote } from '../components/VoiceNote'
import { read, useStored, write } from '../lib/store'

export const Route = createFileRoute('/familia/contanos')({
  component: TellUsScreen,
})

const EXAMPLE =
  'Somos Alex y Caro, tenemos a Milán, de dos años, y a Inca, nuestra mascota. A Milán le encantan los dinosaurios y los caballos, y tiene un tren de madera que no suelta.'

/**
 * 2d. The prompt is the headline. The box grows to fill the screen, with the
 * brief's example as hint text; no counter, no validation.
 *
 * The mic records a voice note (2e, JUG-95). Its words join the box, where
 * the parent checks them like anything typed, and "Listo" sends them on the
 * same path. While a note records, the prompt dims and the strip replaces
 * "Listo".
 *
 * Reading the family's own words needs the LLM (JUG-11), so for now first run
 * skips this screen and "Listo" continues to the form. The draft is kept for
 * when reading arrives.
 */
function TellUsScreen() {
  const navigate = useNavigate()
  const draft = useStored('familyDraft') ?? ''
  const [recording, setRecording] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState(
    /** @type {import('../components/VoiceNote').VoiceMessage | null} */ (null),
  )

  useEffect(() => {
    document.title = 'Contame de tu familia · Juguemos'
  }, [])

  const toForm = () => void navigate({ to: '/familia/corregir' })

  /** A note's words go after whatever is already in the box. @param {string} text */
  const addWords = (text) => {
    const current = read('familyDraft')?.trim()
    write('familyDraft', current ? `${current} ${text}` : text)
  }

  return (
    <Screen className={recording ? 'tell tell--recording' : 'tell'}>
      <div className="tell__prompt">
        <h1 className="prompt">
          Contame de tu familia: quiénes son, cuántos años tienen los chicos, qué les encanta y con qué juegan.
        </h1>
      </div>
      <Body className="tell__body">
        <label className="visually-hidden" htmlFor="family-text">
          Tu familia, en tus palabras
        </label>
        <textarea
          id="family-text"
          className="tell__text"
          value={draft}
          placeholder={EXAMPLE}
          readOnly={recording}
          onChange={(event) => write('familyDraft', event.target.value)}
        />
        {voiceMessage && (
          <div className="tell__voice-message">
            <p className="status-line" role="status">
              {voiceMessage.text}
            </p>
            {voiceMessage.retry && (
              // Voice pass pending.
              <TertiaryButton size="inline" onClick={voiceMessage.retry}>
                Mandar de nuevo
              </TertiaryButton>
            )}
          </div>
        )}
        {/* Voice pass pending: "Listo" and "Prefiero un formulario". */}
        <p className="tell__help">Escribilo, o mantené apretado el micrófono y contámelo.</p>
        <TertiaryButton size="inline" onClick={toForm}>
          Prefiero un formulario
        </TertiaryButton>
      </Body>
      <Footer row>
        <VoiceNote onText={addWords} onMessage={setVoiceMessage} onRecording={setRecording}>
          <PrimaryButton className="grow" onClick={toForm}>
            Listo
          </PrimaryButton>
        </VoiceNote>
      </Footer>
    </Screen>
  )
}
