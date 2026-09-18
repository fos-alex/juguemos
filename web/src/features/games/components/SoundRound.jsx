import { answerLine, creditLine } from '../model'
import { CheckIcon } from '../../../shared/ui'

/** @typedef {import('../../activities').Round} Round */

/**
 * One round, in words the parent reads out: *¿Es…* and the options, then the
 * answer in their place over the options, marked with a tint, a bar, and a
 * check, so colour is never the only sign. A recording whose license asks
 * for credit names its author under them.
 *
 * Once the sound has played, each option is a button: the parent taps what
 * the kids said, and it does what *Ver la respuesta* does. It reveals the
 * right one whichever was tapped, so a wrong guess just hears the answer and
 * nothing marks it wrong. After that, a tap says the answer again.
 * @param {{ round: Round, revealed: boolean, onChoose?: () => void }} props `onChoose` is left out until the sound has played
 */
export function SoundRound({ round, revealed, onChoose }) {
  return (
    <>
      {/* Voice pass pending: "¿Es…". */}
      <h1 className="sound-game__question" aria-live="polite">
        {revealed ? answerLine(round) : '¿Es…'}
      </h1>
      <ul className={`sound-options${revealed ? ' is-revealed' : ''}`}>
        {round.options.map((option, index) => {
          const answer = revealed && index === round.answer
          const words = (
            <>
              {option}
              {answer && <CheckIcon className="sound-option__check" />}
            </>
          )
          return (
            <li key={index} className={`sound-option${answer ? ' is-answer' : ''}`}>
              {onChoose ? (
                <button type="button" className="sound-option__button" onClick={onChoose}>
                  {words}
                </button>
              ) : (
                <span className="sound-option__words">{words}</span>
              )}
            </li>
          )
        })}
      </ul>
      {round.credit && <p className="sound-game__credit">{creditLine(round.credit)}</p>}
    </>
  )
}
