import { playingNames } from '../../family'
import { useStored } from '../../../shared/store'
import { Label, MusicIcon } from '../../../shared/ui'
import '../activities.css'

/**
 * Tells the grown-up, before Empezar, that this juego plays sound on the
 * phone (JUG-177): the one kind of juego that does. Its sand tint sets it
 * apart from the lilac *Por qué ahora* card.
 */
export function SoundNotice() {
  // The kids playing on this device (JUG-107), as the timer names them.
  const names = playingNames(useStored('family')) || 'los chicos'
  return (
    <aside className="sound-notice">
      <MusicIcon className="sound-notice__icon" />
      <div>
        {/* Voice pass pending: the label and the line. */}
        <Label small>Juego con sonido</Label>
        <p className="sound-notice__text">
          Este juego va a hacer sonidos en tu celular. Poné el volumen a la mitad y jugá con {names} a adivinar qué
          suena.
        </p>
      </div>
    </aside>
  )
}
