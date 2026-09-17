import { interestMark } from '../../family'
import { MarkIcon } from '../../../shared/ui'
import '../stories.css'

/**
 * The mark of the interest a story is about (JUG-160), in the corner of its
 * card: dinosaur footprints for a story about dinosaurs, a car for one about
 * cars. Found in the story's own words, so most stories have none. It sits
 * beside a story, never inside the text a parent reads.
 * @param {{ texts: (string | null | undefined)[] }} props the words to look in, most telling first
 */
export function StoryMark({ texts }) {
  const mark = interestMark(...texts)
  if (!mark) return null
  return <MarkIcon mark={mark} size={26} className="story-mark" />
}
