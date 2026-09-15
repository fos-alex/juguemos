import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { understandFamily } from '../../../api'
import { PrimaryButton, TertiaryButton } from '../../../shared/ui/Buttons'
import { Body, Footer, Screen } from '../../../shared/ui/Screen'
import { VoiceNote } from '../../voice/components/VoiceNote'
import { failureText } from '../../../shared/format'
import { read, useStored, write } from '../../../shared/store'
import { StatusLine } from '../../../shared/ui/StatusLine'

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
 * "Listo" sends the text to the API, whose LLM reads the family in it (JUG-11),
 * and opens the review card. If that fails, the text stays for another try.
 * With nothing written, "Listo" opens the form.
 */
function TellUsScreen() {
  const navigate = useNavigate()
  const draft = useStored('familyDraft') ?? ''
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  const [recording, setRecording] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState(
    /** @type {import('../../voice/components/VoiceNote').VoiceMessage | null} */ (null),
  )

  useEffect(() => {
    document.title = 'Contame de tu familia · Juguemos'
  }, [])

  const toForm = () => void navigate({ to: '/familia/corregir' })

  const understand = async () => {
    if (busy) return
    const text = draft.trim()
    if (!text) return toForm()
    setBusy(true)
    setFailure(null)
    try {
      await understandFamily(text)
      void navigate({ to: '/familia/revisar' })
    } catch (error) {
      setFailure(failureText(error))
      setBusy(false)
    }
  }

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
          readOnly={busy || recording}
          onChange={(event) => write('familyDraft', event.target.value)}
        />
        <StatusLine role="alert">{failure}</StatusLine>
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
        <VoiceNote onText={addWords} onMessage={setVoiceMessage} onRecording={setRecording}>
          <PrimaryButton className="grow" busy={busy} busyLabel="Leyendo" onClick={() => void understand()}>
            Listo
          </PrimaryButton>
        </VoiceNote>
      </Footer>
    </Screen>
  )
}
