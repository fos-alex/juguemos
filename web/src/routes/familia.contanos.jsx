import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { understandFamily } from '../api'
import { PrimaryButton, TertiaryButton } from '../components/Buttons'
import { Body, Footer, Screen } from '../components/Screen'
import { failureText } from '../lib/format'
import { useStored, write } from '../lib/store'

export const Route = createFileRoute('/familia/contanos')({
  component: TellUsScreen,
})

const EXAMPLE =
  'Somos Alex y Caro, tenemos a Milán, de dos años, y a Inca, nuestra mascota. A Milán le encantan los dinosaurios y los caballos, y tiene un tren de madera que no suelta.'

/**
 * 2d. The prompt is the headline. The box grows to fill the screen, with the
 * brief's example as hint text; no counter, no validation. The mic is a 0.2
 * placeholder: it holds its position and does nothing yet.
 */
function TellUsScreen() {
  const navigate = useNavigate()
  const draft = useStored('familyDraft') ?? ''
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    document.title = 'Contame de tu familia · Juguemos'
  }, [])

  const done = async () => {
    // Nothing written means nothing to read back: the form is the way in.
    if (!draft.trim()) {
      void navigate({ to: '/familia/corregir' })
      return
    }
    setBusy(true)
    setFailure(null)
    try {
      await understandFamily(draft)
      void navigate({ to: '/familia/revisar' })
    } catch (error) {
      setFailure(failureText(error))
      setBusy(false)
    }
  }

  return (
    <Screen className="tell">
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
          onChange={(event) => write('familyDraft', event.target.value)}
        />
        {failure && (
          <p className="status-line" role="alert">
            {failure}
          </p>
        )}
        {/* Voice pass pending: "Listo" and "Prefiero un formulario". */}
        <p className="tell__help">Escribilo, o mantené apretado el micrófono y contámelo.</p>
        <TertiaryButton size="inline" onClick={() => void navigate({ to: '/familia/corregir' })}>
          Prefiero un formulario
        </TertiaryButton>
      </Body>
      <Footer row>
        <PrimaryButton className="grow" busy={busy} busyLabel="Leyendo lo que escribiste" onClick={done}>
          Listo
        </PrimaryButton>
        <button type="button" className="mic" aria-disabled="true" aria-label="Nota de voz. Llega en la versión 0.2.">
          <span className="mic__glyph" aria-hidden="true">
            <span className="mic__capsule" />
            <span className="mic__base" />
          </span>
          <span className="mic__tag" aria-hidden="true">
            0.2
          </span>
        </button>
      </Footer>
    </Screen>
  )
}
