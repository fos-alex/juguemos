import { useEffect } from 'react'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { SecondaryButton, TertiaryButton } from '../components/Buttons'
import { MetaLabel } from '../components/Card'
import { Body, Footer, Header, Screen } from '../components/Screen'
import { useCountdown } from '../hooks/useCountdown'
import { useGoBack } from '../hooks/useGoBack'
import { clockText } from '../lib/format'
import { useStored, write } from '../lib/store'

export const Route = createFileRoute('/idea/$id/reloj')({
  component: TimerScreen,
})

/**
 * 2o. The timer exists to get the phone out of the parent's hand. It counts
 * down from the activity's own estimate as a hint, not a target, and is
 * silent at zero. The app never logs or reports how long they played.
 * Copy on this screen needs a voice pass.
 */
function TimerScreen() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const goBack = useGoBack('/idea/$id', { id })
  const activity = useStored('activities')?.[id]
  const timer = useStored('timer')
  const mine = timer?.activityId === id
  const remaining = useCountdown(mine ? timer.endsAt : null)

  useEffect(() => {
    if (activity) document.title = `${clockText(remaining)} · ${activity.title}`
  }, [activity, remaining])

  if (!activity || !mine) return <Navigate to="/idea/$id" params={{ id }} replace />

  const finish = async () => {
    await navigate({ to: '/', replace: true })
    write('timer', null)
  }

  return (
    <Screen tone="accent">
      <Header
        onBack={goBack}
        trailing={
          <MetaLabel tone="grass">
            {activity.minutes} min · {activity.place}
          </MetaLabel>
        }
      />
      <Body className="timer">
        <p className="timer__title">{activity.title}</p>
        <p className="timer__clock" role="timer" aria-label={`Quedan ${clockText(remaining)}`}>
          {clockText(remaining)}
        </p>
        <p className="timer__hint">Dejá el teléfono. El reloj sigue solo.</p>
      </Body>
      <Footer>
        <SecondaryButton size="lg" outline="primary" onClick={goBack}>
          Ocultar el reloj
        </SecondaryButton>
        <TertiaryButton onClick={finish}>Terminamos</TertiaryButton>
      </Footer>
    </Screen>
  )
}
