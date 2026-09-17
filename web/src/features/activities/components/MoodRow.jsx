import { chooseActivityMood } from '../api'
import { moodNow } from '../model'
import { useSwitchClock } from '../../../shared/hooks/useSwitchClock'
import { useStored } from '../../../shared/store'
import { Chips, ChipToggle } from '../../../shared/ui'
import '../activities.css'

/**
 * What Ludi is about to suggest before bed, and the way to change it
 * (JUG-26). From 19:00 it offers something tranqui, so an energetic juego
 * doesn't come up at bedtime, and one tap asks for a juego con pilas instead.
 * The tap holds until the next switch, so tranqui comes back on its own the
 * next evening. The rest of the day the row isn't there: Ludi asks for
 * nothing in particular then, and every juego has its turn.
 */
export function MoodRow() {
  const now = useSwitchClock()
  const choice = useStored('activityMood')
  const mood = moodNow({ now, choice })
  if (!mood) return null

  return (
    <div className="mood-row" role="group" aria-labelledby="mood-row-label">
      {/* Voice pass pending: "Antes de dormir", "Tranqui", "Con pilas". */}
      <p id="mood-row-label" className="mood-row__label">
        Antes de dormir
      </p>
      <Chips>
        <ChipToggle pressed={mood === 'calm'} onClick={() => chooseActivityMood('calm')}>
          Tranqui
        </ChipToggle>
        <ChipToggle pressed={mood === 'lively'} onClick={() => chooseActivityMood('lively')}>
          Con pilas
        </ChipToggle>
      </Chips>
    </div>
  )
}
