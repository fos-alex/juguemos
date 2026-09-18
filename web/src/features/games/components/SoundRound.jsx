import { answerLine, creditLine } from '../model'
import { CheckIcon } from '../../../shared/ui'

/** @typedef {import('../../activities').Round} Round */

/**
 * One round, in words the parent reads out: *¿Es…* and the options, then the
 * answer in their place over the options, marked with a tint, a bar, and a
 * check, so colour is never the only sign. A recording whose license asks
 * for credit names its author under them.
 * @param {{ round: Round, revealed: boolean }} props
 */
export function SoundRound({ round, revealed }) {
  return (
    <>
      {/* Voice pass pending: "¿Es…". */}
      <h1 className="sound-game__question" aria-live="polite">
        {revealed ? answerLine(round) : '¿Es…'}
      </h1>
      <ul className={`sound-options${revealed ? ' is-revealed' : ''}`}>
        {round.options.map((option, index) => {
          const answer = revealed && index === round.answer
          return (
            <li key={index} className={`sound-option${answer ? ' is-answer' : ''}`}>
              {option}
              {answer && <CheckIcon className="sound-option__check" />}
            </li>
          )
        })}
      </ul>
      {round.credit && <p className="sound-game__credit">{creditLine(round.credit)}</p>}
    </>
  )
}
