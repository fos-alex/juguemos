import { useNavigate, useSearch } from '@tanstack/react-router'
import { useGoogleSignIn } from '../hooks/useGoogleSignIn'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { Footer, GoogleButton, PrimaryButton, Screen, StatusLine, TertiaryButton, Wordmark } from '../../../shared/ui'
import '../account.css'

/**
 * 2a. The wordmark alone above the fold; the ways in sit in the thumb zone.
 * Google comes first: it creates the account or signs in, with no form.
 */
export function EntryScreen() {
  const { error } = useSearch({ from: '/entrada' })
  const navigate = useNavigate()
  const google = useGoogleSignIn({ returnTo: '/entrada', error })

  useDocumentTitle('Ludi')

  return (
    <Screen className="entry">
      <div className="entry__mark">
        <Wordmark size="splash" />
      </div>
      <Footer className="entry__actions">
        <p className="entry__tagline">El coach de juego que conoce a tu familia.</p>
        <StatusLine className="status-line--center" role="alert">
          {google.failure}
        </StatusLine>
        <GoogleButton busy={google.busy} onClick={google.start} />
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
