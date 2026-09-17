import { toyLine, toyMark } from '../model'
import { Card, MarkIcon, Skeleton, StatusLine } from '../../../shared/ui'
import '../toys.css'

/** @typedef {import('../types').ToyBox} ToyBox */
/** @typedef {import('../../family').Kid} Kid */

/**
 * The toys by their family names, each with the rest of what the box knows in
 * one line, and the mark of what it is in the corner when there is one
 * (JUG-166). Placeholders while this device doesn't have the box yet.
 * @param {{ box: ToyBox | null, kids: Kid[], onOpen: (id: string) => void }} props
 */
export function ToyList({ box, kids, onOpen }) {
  if (!box) {
    return (
      <div className="toy-list" aria-hidden="true">
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </div>
    )
  }
  if (box.toys.length === 0) return <StatusLine>Todavía no hay juguetes en el baúl.</StatusLine>
  return (
    <ul className="toy-list">
      {box.toys.map((toy) => {
        const line = toyLine(toy, box, kids)
        const mark = toyMark(toy)
        return (
          <li key={toy.id}>
            <Card className={mark ? 'toy-marked' : ''} onClick={() => onOpen(toy.id)}>
              {mark && <MarkIcon mark={mark} size={26} className="toy-mark" />}
              <span className="card-title">{toy.name}</span>
              {line && <span className="card-meta">{line}</span>}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
