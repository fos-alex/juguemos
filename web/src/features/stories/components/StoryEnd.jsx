import { useNavigate } from '@tanstack/react-router'
import { useStoryNext } from '../hooks/useStoryNext'
import { PrimaryButton, SecondaryButton, StatusLine } from '../../../shared/ui'
import '../stories.css'

/** @typedef {import('../types').Story} Story */

/**
 * Under the last paragraph (JUG-154): Listo goes back to Home, and the story
 * can become a series, or an episode leads to the next one.
 * @param {{ story: Story }} props
 */
export function StoryEnd({ story }) {
  const navigate = useNavigate()
  const next = useStoryNext(story)

  return (
    <div className="story-end">
      {/* Voice pass pending: "Listo", "Hacer una serie", and "Leer otro episodio". */}
      <PrimaryButton size="md" onClick={() => void navigate({ to: '/' })}>
        Listo
      </PrimaryButton>
      {next.kind && (
        <SecondaryButton busy={next.busy} busyLabel="Armando la serie" unavailable={!next.online} onClick={next.go}>
          {next.kind === 'series' ? 'Hacer una serie' : 'Leer otro episodio'}
        </SecondaryButton>
      )}
      <StatusLine role="alert">{next.failure}</StatusLine>
    </div>
  )
}
