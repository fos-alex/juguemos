import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { continueWithGoogle } from '../api'
import { GoogleButton, PrimaryButton, TertiaryButton } from '../components/Buttons'
import { Footer, Screen } from '../components/Screen'
import { Wordmark } from '../components/Wordmark'
import { failureText } from '../lib/format'

export const Route = createFileRoute('/entrada')({
  component: EntryScreen,
})

/** 2a. The wordmark alone above the fold; both ways in sit in the thumb zone. */
function EntryScreen() {
  const navigate = useNavigate()
  const [google, setGoogle] = useState(/** @type {'idle' | 'loading'} */ ('idle'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    document.title = 'Juguemos'
  }, [])

  // Google arrives with the email already verified, so it skips 2b and 2c.
  const withGoogle = async () => {
    setGoogle('loading')
    setFailure(null)
    try {
      await continueWithGoogle()
      // The first-run guard knows where a new account goes next.
      void navigate({ to: '/', replace: true })
    } catch (error) {
      setFailure(failureText(error))
      setGoogle('idle')
    }
  }

  return (
    <Screen className="entry">
      <div className="entry__mark">
        <Wordmark size="splash" />
      </div>
      <Footer className="entry__actions">
        <p className="entry__tagline">El coach de juego que conoce a tu familia.</p>
        {failure && (
          <p className="status-line status-line--center" role="alert">
            {failure}
          </p>
        )}
        <GoogleButton busy={google === 'loading'} onClick={withGoogle} />
        <PrimaryButton size="md" className="btn--text-20" onClick={() => void navigate({ to: '/cuenta' })}>
          Crear cuenta con email
        </PrimaryButton>
        <TertiaryButton onClick={() => void navigate({ to: '/cuenta', search: { modo: 'entrar' } })}>
          Ya tengo cuenta
        </TertiaryButton>
      </Footer>
    </Screen>
  )
}
