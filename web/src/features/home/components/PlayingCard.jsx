import { useNavigate } from '@tanstack/react-router'
import { stopTimer } from '../../activities'
import { clockText } from '../../../shared/format'
import { useCountdown } from '../../../shared/hooks/useCountdown'
import { Card, MetaLabel, TertiaryButton } from '../../../shared/ui'

/** @typedef {import('../../activities').Activity} Activity */
/** @typedef {import('../../activities').Timer} Timer */

/**
 * The juego being played, in the last juego's place on Home: its title and the
 * time left, which stops at 0:00 without a sound, like the timer. The card
 * opens the timer, and Terminamos ends the juego from Home (JUG-134).
 * Voice pass pending: "Jugando ahora".
 * @param {{ activity: Activity, timer: Timer }} props
 */
export function PlayingCard({ activity, timer }) {
  const navigate = useNavigate()
  const remaining = useCountdown(timer.endsAt)

  return (
    <div className="playing">
      <Card onClick={() => void navigate({ to: '/idea/$id/reloj', params: { id: activity.id } })}>
        <span className="playing__row">
          <span className="playing__what">
            <MetaLabel as="span" wide>
              Jugando ahora
            </MetaLabel>
            <span className="card-title">{activity.title}</span>
          </span>
          <span className="playing__clock">
            <span className="visually-hidden">Quedan </span>
            {clockText(remaining)}
          </span>
        </span>
      </Card>
      <TertiaryButton onClick={() => stopTimer()}>Terminamos</TertiaryButton>
    </div>
  )
}
