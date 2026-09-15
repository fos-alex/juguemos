import { Skeleton } from '../../../shared/ui'
import '../stories.css'

/** A story option's placeholder, the size of the card it holds the place of. */
export function OptionSkeleton() {
  return (
    <div className="card story-option story-option--skeleton" aria-hidden="true">
      <Skeleton width="86%" height={20} />
      <Skeleton width="64%" height={14} />
      <Skeleton width={42} height={11} />
    </div>
  )
}
