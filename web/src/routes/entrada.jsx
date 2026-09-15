import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PrimaryButton, TertiaryButton } from '../shared/ui/Buttons'
import { Footer, Screen } from '../shared/ui/Screen'
import { Wordmark } from '../shared/ui/Wordmark'

export const Route = createFileRoute('/entrada')({
  component: EntryScreen,
})

/**
 * 2a. The wordmark alone above the fold; both ways in sit in the thumb zone.
 * The Google button comes back with Sign in with Google (0.3).
 */
function EntryScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Juguemos'
  }, [])

  return (
    <Screen className="entry">
      <div className="entry__mark">
        <Wordmark size="splash" />
      </div>
      <Footer className="entry__actions">
        <p className="entry__tagline">El coach de juego que conoce a tu familia.</p>
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
