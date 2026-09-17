import { familyRows } from '../model'
import { MetaLabel } from '../../../shared/ui'
import '../family.css'

/** @typedef {import('../types').Family} Family */

/**
 * What the app understood about the family, in the family's own words, one
 * row per fact. Flagged rows are tinted, barred, and say "tocá para corregir"
 * (three signals, never colour alone), and only they can be tapped. `toys`
 * adds the toys, which only onboarding's card shows (JUG-21).
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
            {isFlagged && <span className="family-row__fix">tocá para corregir</span>}
          </>
        )
        return isFlagged && onFix ? (
          <button key={row.field} type="button" className="family-row is-flagged" onClick={() => onFix(row.field)}>
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
