import { HOMES } from '../model'
import { ChipToggle, Chips, FieldGroup } from '../../../shared/ui'

/** @typedef {import('../types').Home} Home */

/**
 * The kind of home, in the family form (JUG-21): a chip each, at most one
 * chosen. Tapping the chosen one again leaves it unsaid. Nothing uses it
 * yet; activities will suit it later.
 * @param {{ home: Home | null, onChange: (home: Home | null) => void }} props
 */
export function HomeChoice({ home, onChange }) {
  return (
    // Voice pass pending.
    <FieldGroup label="Mi casa">
      <Chips>
        {HOMES.map((each) => (
          <ChipToggle
            key={each.key}
            pressed={home === each.key}
            data-field={each.key === HOMES[0].key ? 'home' : undefined}
            onClick={() => onChange(home === each.key ? null : each.key)}
          >
            {each.label}
          </ChipToggle>
        ))}
      </Chips>
    </FieldGroup>
  )
}
