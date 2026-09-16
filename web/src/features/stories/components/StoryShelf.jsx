import { MetaLabel, TertiaryButton } from '../../../shared/ui'
import '../stories.css'

/** @typedef {import('../types').SavedStorySummary} SavedStorySummary */

/**
 * The stories the family has already read, to read again with one tap
 * (JUG-50), each with the way to turn it into a series (JUG-59). The episodes
 * of a series are not here: they are read under their series.
 * @param {{
 *   stories: SavedStorySummary[],
 *   startingId: string | null,
 *   onOpen: (story: SavedStorySummary) => void,
 *   onStartSeries: (story: SavedStorySummary) => void,
 * }} props `startingId` is the story whose series is being made right now
 */
export function StoryShelf({ stories, startingId, onOpen, onStartSeries }) {
  if (stories.length === 0) return null
  return (
    <section className="story-shelf">
      {/* Voice pass pending: "Para volver a leer". */}
      <h2 className="story-shelf__heading">Para volver a leer</h2>
      {stories.map((saved) => (
        <div key={saved.id} className="card story-option story-shelf__row">
          <button type="button" className="story-shelf__open" onClick={() => onOpen(saved)}>
            <span className="story-option__title">{saved.title}</span>
            <MetaLabel as="span" className="story-option__time">
              {saved.minutes} min
            </MetaLabel>
          </button>
          {/* Voice pass pending: "Hacer una serie". */}
          <TertiaryButton
            size="inline"
            busy={startingId === saved.id}
            busyLabel="Armando la serie"
            onClick={() => onStartSeries(saved)}
          >
            Hacer una serie
          </TertiaryButton>
        </div>
      ))}
    </section>
  )
}
