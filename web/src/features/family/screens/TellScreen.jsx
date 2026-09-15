import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { VoiceNote } from '../../voice'
import { addToDraft, keepDraft, understandFamily } from '../api'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useRequest } from '../../../shared/hooks/useRequest'
import { useStored } from '../../../shared/store'
import { Body, Footer, PrimaryButton, Screen, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../family.css'

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
 * "Listo" sends the text to the API, whose LLM reads the family in it (JUG-11),
 * and opens the review card. If that fails, the text stays for another try.
 * With nothing written, "Listo" opens the form.
 */
export function TellScreen() {
  const navigate = useNavigate()
  const draft = useStored('familyDraft') ?? ''
  const request = useRequest()
  const [recording, setRecording] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState(/** @type {import('../../voice').VoiceMessage | null} */ (null))

  useDocumentTitle('Contame de tu familia · Juguemos')

  const toForm = () => void navigate({ to: '/familia/corregir' })

  const understand = () => {
    if (request.busy) return
    const text = draft.trim()
    if (!text) return toForm()
    void request.run(async () => {
      await understandFamily(text)
      void navigate({ to: '/familia/revisar' })
    })
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
          readOnly={request.busy || recording}
          onChange={(event) => keepDraft(event.target.value)}
        />
        <StatusLine role="alert">{request.failure}</StatusLine>
        {voiceMessage && (
          <div className="tell__voice-message">
            <StatusLine role="status">{voiceMessage.text}</StatusLine>
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
        <VoiceNote onText={addToDraft} onMessage={setVoiceMessage} onRecording={setRecording}>
          <PrimaryButton className="grow" busy={request.busy} busyLabel="Leyendo" onClick={understand}>
            Listo
          </PrimaryButton>
        </VoiceNote>
      </Footer>
    </Screen>
  )
}
