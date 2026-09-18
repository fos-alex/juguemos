import { useId } from 'react'
import { chooseActivity } from '../api'
import { choicesNow, QUESTIONS } from '../model'
import { useSwitchClock } from '../../../shared/hooks/useSwitchClock'
import { useStored } from '../../../shared/store'
import { Chips, ChipToggle, Label, PrimaryButton, Sheet, TertiaryButton } from '../../../shared/ui'
import '../activities.css'

/**
 * ¿Algo en especial? (JUG-31): what the next juego should be, as four
 * questions with one answer each at most. A tap saves at once and a second
 * tap on the same answer takes it back, so closing the sheet keeps what was
 * chosen. ¡Juguemos! asks for a juego with it, and *Cualquier juego* takes it
 * all back. Where, sound, and kind are firm; Tranqui and Con pilas lean the
 * pick, as before bed (JUG-26).
 * @param {{ open: boolean, onClose: () => void, onPlay: () => void }} props
 */
export function ChoiceSheet({ open, onClose, onPlay }) {
  const now = useSwitchClock()
  const choices = choicesNow({ now, stored: useStored('activityChoices') })
  const id = useId()

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="¿Qué juego buscan?"
      footer={
        <>
          <PrimaryButton size="md" onClick={onPlay}>
            ¡Juguemos!
          </PrimaryButton>
          {/* Voice pass pending: "Cualquier juego". */}
          <TertiaryButton
            onClick={() => {
              chooseActivity(null)
              onClose()
            }}
          >
            Cualquier juego
          </TertiaryButton>
        </>
      }
    >
      <div className="choice-sheet">
        {QUESTIONS.map(({ key, label, answers }) => (
          <section key={key} className="choice-sheet__question" role="group" aria-labelledby={`${id}-${key}`}>
            <Label small tone="muted" as="h3" id={`${id}-${key}`}>
              {label}
            </Label>
            <Chips>
              {answers.map((answer) => {
                const chosen = choices[key] === answer.value
                return (
                  <ChipToggle
                    key={answer.label}
                    pressed={chosen}
                    onClick={() => chooseActivity({ [key]: chosen ? null : answer.value })}
                  >
                    {answer.label}
                  </ChipToggle>
                )
              })}
            </Chips>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
