import { useParams } from '@tanstack/react-router'
import { StoryReader } from '../components/StoryReader'

/**
 * The same reading screen, for a story written from one of the family's
 * interests (JUG-140). The URL becomes the story's own as soon as it is saved.
 */
export function KeywordStoryScreen() {
  const { keyword } = useParams({ from: '/cuento/tema/$keyword' })
  return <StoryReader keyword={keyword} />
}
