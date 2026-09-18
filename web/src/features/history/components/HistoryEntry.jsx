import { placeText } from '../../activities'
import { StoryMark } from '../../stories'
import { Card, MetaLabel, ThumbDownIcon, ThumbUpIcon } from '../../../shared/ui'
import '../history.css'

/** @typedef {import('../types').Entry} Entry */

/**
 * One juego or story in Lo que jugamos (JUG-188), as a card that opens it
 * again. What it is is said in words over its title. A juego says how it
 * went when the parent said so; a story has its mark in the corner, as on the
 * shelves, and its series when it is an episode.
 * @param {{ entry: Entry, onOpen: () => void }} props
 */
export function HistoryEntry({ entry, onOpen }) {
  if (entry.kind === 'activity') {
    const { activity } = entry
    return (
      <Card className="history-entry" onClick={onOpen}>
        <MetaLabel as="span" wide tone="grass">
          Juego
        </MetaLabel>
        <span className="card-title">{activity.title}</span>
        <span className="card-meta">
          {activity.minutes} min · {placeText(activity.place)}
        </span>
        {activity.reaction && (
          <span className="history-entry__reaction">
            {activity.reaction === 'up' ? <ThumbUpIcon size={16} /> : <ThumbDownIcon size={16} />}
            {activity.reaction === 'up' ? '¡Lo hicimos!' : 'No era para nosotros'}
          </span>
        )}
      </Card>
    )
  }

  const { story } = entry
  return (
    <Card className="history-entry story-marked" onClick={onOpen}>
      <StoryMark texts={[story.title, story.teaser]} />
      <MetaLabel as="span" wide>
        {story.series ? `${story.series.title} · Episodio ${story.series.episode}` : 'Cuento'}
      </MetaLabel>
      <span className="card-title">{story.title}</span>
      <span className="card-meta">{story.minutes} min</span>
    </Card>
  )
}
