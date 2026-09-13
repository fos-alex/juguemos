import { useEffect, useState } from 'react'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { suggestActivity } from '../api'
import { ActivitySkeleton, ActivityView } from '../components/ActivityView'
import { PrimaryButton, SecondaryButton } from '../components/Buttons'
import { MetaLabel, Skeleton } from '../components/Card'
import { Body, Footer, Header, Screen } from '../components/Screen'
import { useCountdown } from '../hooks/useCountdown'
import { useGoBack } from '../hooks/useGoBack'
import { useOnline } from '../hooks/useOnline'
import { useDemo } from '../lib/demo'
import { clockText, failureText } from '../lib/format'
import { useStored, write } from '../lib/store'

export const Route = createFileRoute('/idea/$id/')({
  component: ActivityScreen,
})

/**
 * 2m / 2n, with 2p as its swap state. "Otra idea" turns the blocks into
 * placeholders in place and pushes the next idea, so back returns to the
 * previous one. No counter of ideas seen, no shuffle animation.
 */
function ActivityScreen() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const online = useOnline()
  const { activityLayout } = useDemo()
  const activity = useStored('activities')?.[id]
  const timer = useStored('timer')
  const running = timer?.activityId === id ? timer : null
  const remaining = useCountdown(running?.endsAt)
  const [swap, setSwap] = useState(/** @type {'idle' | 'loading' | 'offline' | 'error'} */ ('idle'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!activity) return
    write('lastActivityId', id)
    document.title = `${activity.title} · Juguemos`
  }, [id, activity])

  if (!activity) return <Navigate to="/" replace />

  const loading = swap === 'loading'

  const another = async () => {
    if (!online) {
      setSwap('offline')
      return
    }
    setSwap('loading')
    try {
      const next = await suggestActivity({ after: id })
      await navigate({ to: '/idea/$id', params: { id: next.id } })
      setSwap('idle')
    } catch (error) {
      setFailure(failureText(error))
      setSwap('error')
    }
  }

  // The timer belongs to the activity: starting again reopens the running clock.
  const start = () => {
    if (!running) write('timer', { activityId: id, endsAt: Date.now() + activity.minutes * 60_000 })
    void navigate({ to: '/idea/$id/reloj', params: { id } })
  }

  const trailing = loading ? (
    <Skeleton width={116} height={12} />
  ) : running ? (
    <button
      type="button"
      className="header-clock"
      aria-label={`Ver el reloj. Quedan ${clockText(remaining)}.`}
      onClick={() => void navigate({ to: '/idea/$id/reloj', params: { id } })}
    >
      {clockText(remaining)}
    </button>
  ) : (
    <MetaLabel tone="grass">
      {activity.minutes} min · {activity.place}
    </MetaLabel>
  )

  const notice =
    swap === 'offline' && !online ? 'Estás sin conexión. La última idea sigue acá.' : swap === 'error' ? failure : null

  return (
    <Screen>
      <Header onBack={goBack} trailing={trailing} />
      <Body className="activity-body">
        {loading ? <ActivitySkeleton /> : <ActivityView activity={activity} layout={activityLayout} />}
      </Body>
      <Footer sticky className="activity-footer">
        {notice && (
          <p className="status-line" role="status">
            {notice}
          </p>
        )}
        <div className="button-row">
          {/* Voice pass pending: "Empezar". */}
          <PrimaryButton size="md" className="grow-3" disabled={loading} onClick={start}>
            Empezar
          </PrimaryButton>
          <SecondaryButton
            className="grow-2 btn--text-19"
            busy={loading}
            busyLabel="Buscando otra idea"
            unavailable={!online}
            onClick={another}
          >
            Otra idea
          </SecondaryButton>
        </div>
      </Footer>
    </Screen>
  )
}
