import { useParams } from '@tanstack/react-router'
import { StoryReader } from '../components/StoryReader'

/** 2s then 2t: the story behind an option, or one the family saved. */
export function ReadingScreen() {
  const { id } = useParams({ from: '/cuento/$id' })
  return <StoryReader id={id} />
}
