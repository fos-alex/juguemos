import { familyRows } from '../model'
import { MetaLabel } from '../../../shared/ui'
import '../family.css'

/** @typedef {import('../types').Family} Family */

/**
 * What the app understood about the family, in the family's own words, one
 * row per fact. Every row is tappable to edit when `onFix` is given, and says
 * so: "tocá para editar", or "tocá para corregir" on a flagged row, which is
 * also tinted and barred (three signals, never colour alone). `toys` adds
 * the toys, which only onboarding's card shows (JUG-21).
 * @param {{ family: Family, toys?: boolean, flagged?: string[], onFix?: (field: string) => void }} props
 */
export function FamilyCard({ family, toys = false, flagged = [], onFix }) {
  return (
    <div className="card family-card">
      {familyRows(family, { toys }).map((row) => {
        const isFlagged = flagged.includes(row.flag ?? row.field)
        const content = (
          <>
            <MetaLabel as="span" wide tone={isFlagged ? 'primary' : 'faint'}>
              {row.label}
            </MetaLabel>
            <span className="family-row__value">
              {row.value}
              {row.aside && <span className="family-row__aside"> {row.aside}</span>}
            </span>
            {onFix && <span className="family-row__fix">{isFlagged ? 'tocá para corregir' : 'tocá para editar'}</span>}
          </>
        )
        return onFix ? (
          <button
            key={row.field}
            type="button"
            className={`family-row${isFlagged ? ' is-flagged' : ''}`}
            onClick={() => onFix(row.field)}
          >
            {content}
          </button>
        ) : (
          <div key={row.field} className={`family-row${isFlagged ? ' is-flagged' : ''}`}>
            {content}
          </div>
        )
      })}
    </div>
  )
}
