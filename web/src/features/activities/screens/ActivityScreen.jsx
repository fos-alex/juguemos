import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { rememberLast, startTimer, suggestActivity } from '../api'
import { ActivitySkeleton, ActivityView } from '../components/ActivityView'
import { ReactionRow } from '../components/ReactionRow'
import { placeText } from '../model'
import { clockText, failureText } from '../../../shared/format'
import { useCountdown } from '../../../shared/hooks/useCountdown'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOnline } from '../../../shared/hooks/useOnline'
import { useStored } from '../../../shared/store'
import {
  Body,
  Footer,
  Header,
  MetaLabel,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Skeleton,
  StatusLine,
} from '../../../shared/ui'
import '../activities.css'

/**
 * 2m, with 2p as its swap state. "Otro juego" turns the blocks into
 * placeholders in place and pushes the next juego, so back returns to the
 * previous one. No counter of juegos seen, no shuffle animation.
 *
 * A juego reached through Otro juego says so on its back button, *Juego
 * anterior*, and has the way straight to Home in the top bar (JUG-155). The
 * mark is kept in that history entry, so it survives a reload. Under the
 * juego, the feedback tap (JUG-23), which is where a reaction can be changed.
 */
export function ActivityScreen() {
  const { id } = useParams({ from: '/idea/$id/' })
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const swapped = useRouterState({ select: (state) => Boolean(state.location.state?.swapped) })
  const online = useOnline()
  const activity = useStored('activities')?.[id]
  const timer = useStored('timer')
  const running = timer?.activityId === id ? timer : null
  const remaining = useCountdown(running?.endsAt)
  const [swap, setSwap] = useState(/** @type {'idle' | 'loading' | 'offline' | 'error'} */ ('idle'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useDocumentTitle(activity && `${activity.title} · Ludi`)

  useEffect(() => {
    if (activity) rememberLast(id)
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
      await navigate({ to: '/idea/$id', params: { id: next.id }, state: { swapped: true } })
      setSwap('idle')
    } catch (error) {
      setFailure(failureText(error))
      setSwap('error')
    }
  }

  // The timer belongs to the activity: starting again reopens the running clock.
  const start = () => {
    if (!running) startTimer(id, activity.minutes)
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
      {activity.minutes} min · {placeText(activity.place)}
    </MetaLabel>
  )

  const notice =
    swap === 'offline' && !online ? 'Estás sin conexión. El último juego sigue acá.' : swap === 'error' ? failure : null

  return (
    <Screen>
      {/* Voice pass pending: "Juego anterior". */}
      <Header
        onBack={goBack}
        backLabel={swapped ? 'Juego anterior' : undefined}
        onHome={swapped ? () => void navigate({ to: '/' }) : undefined}
        trailing={trailing}
      />
      <Body className="activity-body">
        {loading ? (
          <ActivitySkeleton />
        ) : (
          <>
            <ActivityView activity={activity} />
            <ReactionRow activity={activity} className="activity__reaction" />
          </>
        )}
      </Body>
      <Footer sticky className="activity-footer">
        <StatusLine role="status">{notice}</StatusLine>
        <div className="button-row">
          {/* Voice pass pending: "Empezar". */}
          <PrimaryButton size="md" className="grow-3" disabled={loading} onClick={start}>
            Empezar
          </PrimaryButton>
          <SecondaryButton
            className="grow-2 btn--text-19"
            busy={loading}
            busyLabel="Buscando otro juego"
            unavailable={!online}
            onClick={another}
          >
            Otro juego
          </SecondaryButton>
        </div>
      </Footer>
    </Screen>
  )
}
