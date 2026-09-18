import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from '@tanstack/react-router'
import { answerLine } from '../model'
import { isLoaded, load, play, playEvenOnSilent, say, soundUrl, stop } from '../player'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useWakeLock } from '../../../shared/hooks/useWakeLock'
import { useStored } from '../../../shared/store'
import {
  Body,
  Footer,
  Header,
  MetaLabel,
  PrimaryButton,
  Screen,
  SoundIcon,
  StatusLine,
  TertiaryButton,
} from '../../../shared/ui'
import { GameEnd } from '../components/GameEnd'
import { SoundRound } from '../components/SoundRound'
import '../games.css'

/**
 * ¿Qué suena? (JUG-177). The parent holds the phone and the kids listen: each
 * round the phone plays a sound, the parent reads the options under *¿Es…*,
 * and the kids answer out loud, by imitating it, or with the toy in hand.
 * *Ver la respuesta* marks the answer and says it, so the game works without
 * looking. Five rounds, then it ends on its own with what they heard, and
 * the feedback tap (JUG-23).
 *
 * Words only: no pictures, no characters, and no score. A wrong guess just
 * hears the answer. Sound plays only on a tap here, the one place Ludi makes
 * any. The primary button walks the round, Escuchar, Ver la respuesta, Otro
 * sonido, with Escuchar otra vez under it once the sound has played; from
 * then on, tapping the option the kids said reveals the answer too. The
 * screen stays on while the game is open.
 */
export function SoundGameScreen() {
  const { id } = useParams({ from: '/idea/$id/que-suena' })
  const navigate = useNavigate()
  const goBack = useGoBack('/idea/$id', { id })
  const activity = useStored('activities')?.[id]
  const game = activity?.game
  const [index, setIndex] = useState(0)
  // The round's sound has played, and its answer is showing.
  const [heard, setHeard] = useState(false)
  const [revealed, setRevealed] = useState(false)
  // Bumped when a recording arrives, so the button stops waiting for it.
  const [, setArrived] = useState(0)
  const [failed, setFailed] = useState(false)

  useWakeLock()
  useDocumentTitle(activity && `${activity.title} · Ludi`)

  useEffect(() => {
    if (!game) return
    let live = true
    for (const each of game.rounds) {
      load(soundUrl(game.set, each.sound)).then(
        () => live && setArrived((count) => count + 1),
        () => live && setFailed(true),
      )
    }
    const release = playEvenOnSilent()
    return () => {
      live = false
      stop()
      release()
    }
  }, [game])

  if (!activity || !game) return <Navigate to="/idea/$id" params={{ id }} replace />

  const round = game.rounds[index]
  const url = round ? soundUrl(game.set, round.sound) : null
  const loaded = url != null && isLoaded(url)
  const last = index === game.rounds.length - 1

  // Played from the tap itself: a phone plays sound only from one.
  const listen = () => {
    if (!url) return
    if (loaded) {
      play(url)
      setHeard(true)
      return
    }
    setFailed(false)
    load(url).then(
      () => setArrived((count) => count + 1),
      () => setFailed(true),
    )
  }

  // Ver la respuesta, or a tap on any option: the answer shows and is said.
  // Tapped again after that, it is said again.
  const reveal = () => {
    setRevealed(true)
    say(answerLine(round))
  }

  const next = () => {
    setRevealed(false)
    setIndex(index + 1)
    const following = game.rounds[index + 1]
    const nextUrl = following ? soundUrl(game.set, following.sound) : null
    if (nextUrl && isLoaded(nextUrl)) {
      play(nextUrl)
      setHeard(true)
    } else {
      stop()
      setHeard(false)
    }
  }

  return (
    <Screen>
      {/* Voice pass pending: "Salir", "Sonido 1 de 5". */}
      <Header
        onBack={goBack}
        backLabel="Salir"
        trailing={
          round && (
            <MetaLabel tone="grass">
              Sonido {index + 1} de {game.rounds.length}
            </MetaLabel>
          )
        }
      />
      <Body className="sound-game">
        {round ? (
          <SoundRound key={index} round={round} revealed={revealed} onChoose={heard ? reveal : undefined} />
        ) : (
          <GameEnd activity={activity} />
        )}
      </Body>
      <Footer sticky className="sound-game__footer">
        {/* Voice pass pending: the failure line and every button below. */}
        <StatusLine role="status">
          {round && !loaded && failed ? 'No pude traer el sonido. Revisá la conexión y probá de nuevo.' : null}
        </StatusLine>
        {!round ? (
          <PrimaryButton size="md" onClick={() => void navigate({ to: '/', replace: true })}>
            Volver al inicio
          </PrimaryButton>
        ) : !heard ? (
          <PrimaryButton size="md" busy={!loaded && !failed} busyLabel="Preparando el sonido" onClick={listen}>
            <SoundIcon />
            Escuchar
          </PrimaryButton>
        ) : (
          <>
            <PrimaryButton size="md" onClick={revealed ? next : reveal}>
              {!revealed ? 'Ver la respuesta' : last ? 'Terminar' : 'Otro sonido'}
            </PrimaryButton>
            <TertiaryButton size="lg" onClick={listen}>
              <SoundIcon />
              Escuchar otra vez
            </TertiaryButton>
          </>
        )}
      </Footer>
    </Screen>
  )
}
