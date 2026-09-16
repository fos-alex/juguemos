import { episodesLine } from '../model'
import { MetaLabel, SecondaryButton, StatusLine } from '../../../shared/ui'
import '../stories.css'

/** @typedef {import('../types').Series} Series */

/**
 * The family's series on ¿Cuál leemos hoy? (JUG-59): the way into each one,
 * and the way to keep it going without opening it first. A series that has all
 * its episodes says so where the button was, so nothing here is a dead tap.
 * @param {{ series: Series[], onOpen: (series: Series) => void, onContinue: (series: Series) => void }} props
 */
export function SeriesShelf({ series, onOpen, onContinue }) {
  if (series.length === 0) return null
  return (
    <section className="story-shelf">
      {/* Voice pass pending: "Series de cuentos". */}
      <h2 className="story-shelf__heading">Series de cuentos</h2>
      {series.map((each) => (
        <div key={each.id} className="card story-option story-shelf__row">
          <button type="button" className="story-shelf__open" onClick={() => onOpen(each)}>
            <span className="story-option__title">{each.title}</span>
            <MetaLabel as="span" className="story-option__time">
              {episodesLine(each.episodes.length)}
            </MetaLabel>
          </button>
          {each.episodes.length >= each.maxEpisodes ? (
            /* Voice pass pending: "Ya tiene todos sus episodios." */
            <StatusLine>Ya tiene todos sus episodios.</StatusLine>
          ) : (
            /* Voice pass pending: "Leer otro episodio". */
            <SecondaryButton size="sm" onClick={() => onContinue(each)}>
              Leer otro episodio
            </SecondaryButton>
          )}
        </div>
      ))}
    </section>
  )
}
