import { useParams } from '@tanstack/react-router'
import { StoryReader } from '../components/StoryReader'

/**
 * The same reading screen, writing the next episode of a series (JUG-59). The
 * URL becomes the episode's own as soon as it is saved.
 */
export function EpisodeScreen() {
  const { id } = useParams({ from: '/serie/$id/episodio' })
  return <StoryReader seriesId={id} />
}
