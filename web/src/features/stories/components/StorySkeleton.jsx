import { Skeleton } from '../../../shared/ui'
import '../stories.css'

/** Placeholder paragraphs whose lines have the story's own line height. @param {{ paragraphs: number }} props */
export function StorySkeleton({ paragraphs }) {
  const shapes = [
    ['100%', '100%', '72%'],
    ['100%', '88%', '46%'],
    ['64%'],
  ].slice(0, paragraphs)
  return (
    <div className="story-skeleton" aria-hidden="true">
      {shapes.map((lines, index) => (
        <div key={index} className="story-skeleton__paragraph">
          {lines.map((width, line) => (
            <span key={line} className="story-skeleton__line">
              <Skeleton width={width} height={17} tone="soft" />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
