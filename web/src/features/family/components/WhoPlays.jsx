import { Chips, ChipToggle } from '../../../shared/ui'
import '../family.css'

/** @typedef {import('../types').Kid} Kid */

/**
 * Who's playing: every kid by name, marked unless the parent took them out.
 * Marked is filled with a check and unmarked is outlined, so colour is never
 * the only difference. The last kid playing stays in. No counts, no nudges.
 * @param {{ kids: Kid[], onToggle: (kid: Kid) => void }} props
 */
export function WhoPlays({ kids, onToggle }) {
  const playingCount = kids.filter((kid) => kid.playing !== false).length
  return (
    <div className="who-plays" role="group" aria-labelledby="who-plays-label">
      {/* Voice pass pending: "¿Quiénes juegan?". */}
      <p id="who-plays-label" className="who-plays__label">
        ¿Quiénes juegan?
      </p>
      <Chips>
        {kids.map((kid, index) => {
          const playing = kid.playing !== false
          return (
            <ChipToggle
              key={kid.id ?? index}
              pressed={playing}
              aria-disabled={(playing && playingCount === 1) || undefined}
              onClick={() => onToggle(kid)}
            >
              {kid.name}
            </ChipToggle>
          )
        })}
      </Chips>
    </div>
  )
}
