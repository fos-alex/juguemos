import { useNavigate } from '@tanstack/react-router'
import { StoryMark } from './StoryMark'
import { MetaLabel, TertiaryButton } from '../../../shared/ui'
import '../stories.css'

/** @typedef {import('../types').SavedStorySummary} SavedStorySummary */

/**
 * The two stories the family read last, to read again with one tap (JUG-50,
 * JUG-189), each with the way to turn it into a series (JUG-59). The link
 * under them opens Lo que jugamos, where the rest are (JUG-188). The episodes
 * of a series are not here: they are read under their series.
 * @param {{
 *   stories: SavedStorySummary[],
 *   startingId: string | null,
 *   onOpen: (story: SavedStorySummary) => void,
 *   onStartSeries: (story: SavedStorySummary) => void,
 * }} props `startingId` is the story whose series is being made right now
 */
export function StoryShelf({ stories, startingId, onOpen, onStartSeries }) {
  const navigate = useNavigate()
  if (stories.length === 0) return null
  return (
    <section className="story-shelf">
      {/* Voice pass pending: "Para volver a leer". */}
      <h2 className="story-shelf__heading">Para volver a leer</h2>
      {stories.map((saved) => (
        <div key={saved.id} className="card story-option story-shelf__row story-marked">
          <StoryMark texts={[saved.title, saved.teaser]} />
          <button type="button" className="story-shelf__open" onClick={() => onOpen(saved)}>
            <span className="story-option__title">{saved.title}</span>
            <MetaLabel as="span" className="story-option__time">
              {saved.minutes} min
            </MetaLabel>
          </button>
          <TertiaryButton
            size="inline"
            busy={startingId === saved.id}
            busyLabel="Armando la serie"
            onClick={() => onStartSeries(saved)}
          >
            Transformar cuento en una serie
          </TertiaryButton>
        </div>
      ))}
      {/* Voice pass pending. */}
      <TertiaryButton size="inline" className="story-shelf__more" onClick={() => void navigate({ to: '/historial' })}>
        Ver todo en Lo que jugamos
      </TertiaryButton>
    </section>
  )
}
