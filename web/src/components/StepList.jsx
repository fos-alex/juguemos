/**
 * Numbered steps, short enough to glance at mid-play. `bullets` puts each
 * number in a jacarandá circle (Activity A); `numerals` uses large lilac
 * numbers and bigger text (Activity B).
 * @param {{ steps: string[], variant?: 'bullets' | 'numerals' }} props
 */
export function StepList({ steps, variant = 'bullets' }) {
  return (
    <ol className={`steps steps--${variant}`}>
      {steps.map((step, index) => (
        <li key={step} className="steps__item">
          <span className="steps__number" aria-hidden="true">
            {index + 1}
          </span>
          <p className="steps__text">{step}</p>
        </li>
      ))}
    </ol>
  )
}
