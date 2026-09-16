import { useState } from 'react'
import { Navigate } from '@tanstack/react-router'
import { StoryReader } from '../components/StoryReader'
import { read } from '../../../shared/store'

/**
 * The same reading screen, for the story the parent asked for in a voice note
 * and said yes to (JUG-156). The request is read once, since writing the story
 * forgets it; the URL becomes the story's own as soon as it is saved. With no
 * request on the device there is nothing to write, so it goes back to the
 * stories.
 */
export function RequestedStoryScreen() {
  const [request] = useState(() => read('storyRequest'))
  if (!request) return <Navigate to="/cuentos" replace />
  return <StoryReader request={request} />
}
