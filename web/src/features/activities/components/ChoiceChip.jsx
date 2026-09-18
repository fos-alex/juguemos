import { chooseActivity } from '../api'
import { choicesNow, choiceWords } from '../model'
import { useSwitchClock } from '../../../shared/hooks/useSwitchClock'
import { isNight } from '../../../shared/theme'
import { useStored } from '../../../shared/store'
import { CheckIcon, CloseIcon, FilterIcon } from '../../../shared/ui'
import '../activities.css'

/**
 * The way into ¿Algo en especial?, above ¡Juguemos! (JUG-31). With nothing
 * chosen it asks the question; with something chosen it says what, filled
 * and with a check, and the cross beside it takes it all back. From 19:00
 * Tranqui comes chosen, under *Antes de dormir*, so an energetic juego
 * doesn't come up at bedtime (JUG-26). `useSwitchClock()` brings that in at
 * 19:00 without a reload, and takes it away at 07:00.
 * @param {{ open: boolean, onOpen: () => void }} props `open` is whether the sheet is showing
 */
export function ChoiceChip({ open, onOpen }) {
  const now = useSwitchClock()
  const stored = useStored('activityChoices')
  const words = choiceWords(choicesNow({ now, stored }))

  if (words.length === 0) {
    return (
      <div className="choice-chip">
        {/* Voice pass pending: "¿Algo en especial?". */}
        <button
          type="button"
          className="chip chip--toggle choice-chip__open"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={onOpen}
        >
          <FilterIcon size={18} />
          ¿Algo en especial?
        </button>
      </div>
    )
  }

  return (
    <div className="choice-chip">
      {/* Voice pass pending: "Antes de dormir". */}
      {isNight(now) && <p className="choice-chip__label">Antes de dormir</p>}
      <div className="choice-chip__row">
        <button
          type="button"
          className="chip chip--toggle choice-chip__open choice-chip__open--chosen"
          aria-label={`Elegido: ${words.join(', ')}. Cambiar`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={onOpen}
        >
          <CheckIcon size={18} />
          <span className="choice-chip__words">{words.join(' · ')}</span>
        </button>
        <button
          type="button"
          className="chip choice-chip__clear"
          aria-label="Cualquier juego"
          onClick={() => chooseActivity(null)}
        >
          <CloseIcon size={18} />
        </button>
      </div>
    </div>
  )
}
