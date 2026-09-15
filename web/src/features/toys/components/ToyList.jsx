import { toyLine } from '../model'
import { Card, Skeleton, StatusLine } from '../../../shared/ui'
import '../toys.css'

/** @typedef {import('../types').ToyBox} ToyBox */
/** @typedef {import('../../family').Kid} Kid */

/**
 * The toys by their family names, each with the rest of what the box knows in
 * one line. Placeholders while this device doesn't have the box yet.
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
        return (
          <li key={toy.id}>
            <Card onClick={() => onOpen(toy.id)}>
              <span className="card-title">{toy.name}</span>
              {line && <span className="card-meta">{line}</span>}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
