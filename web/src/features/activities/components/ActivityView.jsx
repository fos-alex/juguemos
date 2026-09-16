import { Card, Label, MetaLabel, Skeleton, StepList } from '../../../shared/ui'
import '../activities.css'

/** @typedef {import('../types').Activity} Activity */

/**
 * One idea, in either of the two layouts still open (docs/design.md):
 * `porque` (2m) earns trust before the steps, and is the one the app shows;
 * `pasos` (2n) is playable in the first screenful.
 * @param {{ activity: Activity, layout?: 'porque' | 'pasos' }} props
 */
export function ActivityView({ activity, layout = 'porque' }) {
  return layout === 'pasos' ? <StepsFirst activity={activity} /> : <WhyFirst activity={activity} />
}

/** @param {{ activity: Activity }} props */
function WhyFirst({ activity }) {
  return (
    <article className="activity activity--porque">
      <h1 className="activity__title">{activity.title}</h1>
      <Card tone="accent">
        <Label tone="primary">Por qué ahora</Label>
        <p className="activity__why">{activity.why}</p>
      </Card>
      <section>
        <Label tone="muted">Qué necesitás</Label>
        <p className="activity__needs">{activity.needs}</p>
      </section>
      <StepList steps={activity.steps} />
      <div className="activity__variations">
        <section className="variation">
          <Label small tone="grass">
            Más fácil
          </Label>
          <p>{activity.easier}</p>
        </section>
        <section className="variation">
          <Label small tone="primary">
            Más difícil
          </Label>
          <p>{activity.harder}</p>
        </section>
      </div>
    </article>
  )
}

/** @param {{ activity: Activity }} props */
function StepsFirst({ activity }) {
  return (
    <article className="activity activity--pasos">
      <h1 className="activity__title">{activity.title}</h1>
      <p className="activity__needs-line">Necesitás: {activity.needs}</p>
      <hr className="hairline" />
      <StepList steps={activity.steps} variant="numerals" />
      <hr className="hairline" />
      <div className="activity__variations">
        <section className="variation">
          <MetaLabel as="h2" tone="grass">
            Más fácil
          </MetaLabel>
          <p>{activity.easier}</p>
        </section>
        <section className="variation">
          <MetaLabel as="h2" tone="primary">
            Más difícil
          </MetaLabel>
          <p>{activity.harder}</p>
        </section>
      </div>
      <Card tone="accent" className="activity__why-footnote">
        <MetaLabel as="h2" tone="primary">
          Por qué ahora
        </MetaLabel>
        <p className="activity__why">{activity.why}</p>
      </Card>
    </article>
  )
}

/** The idea's own blocks as lilac placeholders, while the next one lands (2p). */
export function ActivitySkeleton() {
  return (
    <div className="activity activity--skeleton" aria-hidden="true">
      <div className="skeleton-stack skeleton-stack--title">
        <Skeleton width="92%" height={28} />
        <Skeleton width="62%" height={28} />
      </div>
      <div className="card card--accent">
        <Skeleton width={84} height={11} tone="accent-strong" />
        <div className="skeleton-stack skeleton-stack--lines">
          <Skeleton height={13} tone="accent" />
          <Skeleton height={13} tone="accent" />
          <Skeleton width="58%" height={13} tone="accent" />
        </div>
      </div>
      <div className="skeleton-stack skeleton-stack--needs">
        <Skeleton width={104} height={11} />
        <Skeleton width="76%" height={13} />
      </div>
      <div className="skeleton-stack skeleton-stack--steps">
        {['100%', '100%', '54%'].map((width, index) => (
          <div key={index} className="skeleton-step">
            <Skeleton width={28} height={28} round />
            <Skeleton width={width} height={14} />
          </div>
        ))}
      </div>
    </div>
  )
}
