import { interestMark } from '../../family'
import { MarkIcon } from '../../../shared/ui'
import '../stories.css'

/**
 * The mark of the interest a story is about (JUG-160, JUG-166), in the corner
 * of its card, or over its title on the reading screen: a dinosaur for a story
 * about dinosaurs, a car for one about cars. Found in the story's own words,
 * so many stories have none. It sits beside a story, never inside the text a
 * parent reads.
 * @param {{ texts: (string | null | undefined)[], place?: 'card' | 'title' }} props the words to
 *   look in, most telling first, and where it sits
 */
export function StoryMark({ texts, place = 'card' }) {
  const mark = interestMark(...texts)
  if (!mark) return null
  if (place === 'title') return <MarkIcon key={mark} mark={mark} size={44} className="story-mark story-mark--title" />
  return <MarkIcon mark={mark} size={26} className="story-mark" />
}
