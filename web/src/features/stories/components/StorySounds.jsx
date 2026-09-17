import { characterMark } from '../../family'
import { MarkIcon, MetaLabel } from '../../../shared/ui'
import '../stories.css'

/**
 * The sounds the parent acts out (JUG-170), under the title and before the
 * text: each sound as the text marks it, who makes it and how, and the mark of
 * whoever makes it when there is one. The marks stay here, beside the story,
 * never inside the text. A story with no sounds has no legend.
 * @param {{ sounds: import('../types').Sound[], family: import('../../family').Family | null | undefined }} props
 */
export function StorySounds({ sounds, family }) {
  if (sounds.length === 0) return null
  const marks = sounds.map((each) => characterMark(each.who, family))
  // Without a single mark, the column that holds them goes too.
  const unmarked = marks.every((mark) => mark === null)

  return (
    <section className={`story-sounds${unmarked ? ' story-sounds--unmarked' : ''}`} aria-label="Sonidos del cuento">
      {/* Voice pass pending. */}
      <MetaLabel tone="grass">Sonidos para hacer</MetaLabel>
      <ul className="story-sounds__list">
        {sounds.map((each, index) => {
          const mark = marks[index]
          return (
            <li key={index} className="story-sounds__row">
              {!unmarked && (mark ? <MarkIcon mark={mark} size={24} className="story-sounds__mark" /> : <span />)}
              <b className="story-sound">{each.sound}</b>
              <span className="story-sounds__how">{[each.who, each.how].filter(Boolean).join(', ')}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
