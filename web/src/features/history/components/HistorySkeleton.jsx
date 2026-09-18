import { Skeleton } from '../../../shared/ui'
import '../history.css'

/** The first day's place while the API answers, on a device that has no history yet. */
export function HistorySkeleton() {
  return (
    <div className="history__day history__day--skeleton" aria-hidden="true">
      <Skeleton width={56} height={16} />
      {[0, 1].map((each) => (
        <div key={each} className="card history-entry">
          <Skeleton width={48} height={11} />
          <Skeleton width="78%" height={20} className="history-entry__line" />
          <Skeleton width={96} height={14} className="history-entry__line" />
        </div>
      ))}
    </div>
  )
}
