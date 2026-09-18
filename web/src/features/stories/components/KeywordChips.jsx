import { interestMark } from '../../family'
import { keywordLabel } from '../model'
import { Chips, MarkIcon } from '../../../shared/ui'
import '../stories.css'

/**
 * What the kids playing love (JUG-140, JUG-144), under the plots: one tap
 * writes a story on that theme. A chip that can't be tapped right now — offline,
 * or while the options are still coming — looks flat but still answers, so the
 * screen can say why. An interest with a mark shows it (JUG-160). A chip says
 * the interest without its article, "dinosaurios" for "los dinosaurios"
 * (JUG-190), and a tap sends it as the family typed it.
 * @param {{ interests: string[], unavailable: boolean, onPick: (interest: string) => void }} props
 */
export function KeywordChips({ interests, unavailable, onPick }) {
  if (interests.length === 0) return null
  return (
    <section className="story-keywords">
      <h2 className="story-shelf__heading">Quizás un cuento de…</h2>
      <Chips>
        {interests.map((interest) => (
          <button
            key={interest}
            type="button"
            className={`chip story-keyword${unavailable ? ' is-unavailable' : ''}`}
            aria-disabled={unavailable || undefined}
            onClick={() => onPick(interest)}
          >
            <KeywordMark interest={interest} />
            {keywordLabel(interest)}
          </button>
        ))}
      </Chips>
    </section>
  )
}

/** @param {{ interest: string }} props */
function KeywordMark({ interest }) {
  const mark = interestMark(interest)
  return mark && <MarkIcon mark={mark} size={17} className="chip__mark" />
}
