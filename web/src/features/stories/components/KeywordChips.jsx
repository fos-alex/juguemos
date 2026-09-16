import { Chips } from '../../../shared/ui'
import '../stories.css'

/**
 * What the kids playing love (JUG-140, JUG-144), under the three plots: one tap
 * writes a story on that theme. A chip that can't be tapped right now — offline,
 * or while the options are still coming — looks flat but still answers, so the
 * screen can say why.
 * @param {{ interests: string[], unavailable: boolean, onPick: (interest: string) => void }} props
 */
export function KeywordChips({ interests, unavailable, onPick }) {
  if (interests.length === 0) return null
  return (
    <section className="story-keywords">
      {/* Voice pass pending: "Un cuento de…". */}
      <h2 className="story-shelf__heading">Un cuento de…</h2>
      <Chips>
        {interests.map((interest) => (
          <button
            key={interest}
            type="button"
            className={`chip story-keyword${unavailable ? ' is-unavailable' : ''}`}
            aria-disabled={unavailable || undefined}
            onClick={() => onPick(interest)}
          >
            {interest}
          </button>
        ))}
      </Chips>
    </section>
  )
}
