import { useNavigate } from '@tanstack/react-router'
import { useStoryNext } from '../hooks/useStoryNext'
import { useStored } from '../../../shared/store'
import { StoryMark } from './StoryMark'
import { MetaLabel, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../stories.css'

/**
 * The last story the parent opened, on Home (JUG-154): one tap reads it again,
 * offline too, and the link under it makes it a series, or reads the next
 * episode when it already is one. Nothing shows until a story has been read.
 */
export function LastStoryCard() {
  const navigate = useNavigate()
  const key = useStored('lastStoryId')
  const story = useStored('stories')?.[key ?? '']
  const next = useStoryNext(story)

  if (!key || !story) return null

  return (
    <div className="card story-shelf__row last-story story-marked">
      <StoryMark texts={[story.keyword, story.title, story.teaser]} />
      <button
        type="button"
        className="story-shelf__open"
        onClick={() => void navigate({ to: '/cuento/$id', params: { id: key } })}
      >
        {/* Voice pass pending: "El último cuento". */}
        <MetaLabel as="span" wide>
          El último cuento
        </MetaLabel>
        <span className="card-title">{story.title}</span>
        <span className="card-meta">
          {story.series ? `Episodio ${story.series.episode} · ` : ''}
          {story.minutes} min
        </span>
      </button>
      {next.kind && (
        <TertiaryButton
          size="inline"
          busy={next.busy}
          busyLabel="Armando la serie"
          unavailable={!next.online}
          onClick={next.go}
        >
          {next.kind === 'series' ? 'Hacer una serie' : 'Leer otro episodio'}
        </TertiaryButton>
      )}
      <StatusLine role="alert">{next.failure}</StatusLine>
    </div>
  )
}
