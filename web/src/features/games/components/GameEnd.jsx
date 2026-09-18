import { ReactionRow } from '../../activities'
import { Card } from '../../../shared/ui'

/** @typedef {import('../../activities').Activity} Activity */

/**
 * The end of a game: what they heard, in the family's words, and a way to
 * keep playing with the phone put away. It lists the sounds, never how many
 * they got right. Under it, the feedback tap (JUG-23), since a game they
 * liked comes back more often.
 * @param {{ activity: Activity }} props
 */
export function GameEnd({ activity }) {
  const rounds = activity.game?.rounds ?? []
  return (
    <>
      {/* Voice pass pending: "¡Listo!", "Escucharon", and the line in the card. */}
      <h1 className="sound-game__question">¡Listo!</h1>
      <section>
        <p className="sound-end__lead">Escucharon:</p>
        <ul className="sound-end__heard">
          {rounds.map((round) => (
            <li key={round.sound}>{round.options[round.answer]}</li>
          ))}
        </ul>
      </section>
      <Card tone="accent">
        <p className="sound-end__after">Ahora sin el teléfono: que cada uno haga un sonido, y los demás adivinen qué es.</p>
      </Card>
      <ReactionRow activity={activity} />
    </>
  )
}
