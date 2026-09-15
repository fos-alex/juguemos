import { MetaLabel } from '../shared/ui/Card'
import { ageText } from '../shared/format'
import './FamilyCard.css'

/** @typedef {import('../api/types').Family} Family */

/**
 * What the app understood about the family, in the family's own words, one
 * row per fact. Flagged rows are tinted, barred, and say "tocá para corregir"
 * (three signals, never colour alone), and only they can be tapped.
 * @param {{ family: Family, flagged?: string[], onFix?: (field: string) => void }} props
 */
export function FamilyCard({ family, flagged = [], onFix }) {
  return (
    <div className="card family-card">
      {familyRows(family).map((row) => {
        const isFlagged = flagged.includes(row.field)
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

/**
 * Rows in a fixed order: each kid, the pet, what they love, the toys. Toy
 * names are joined exactly as typed; only the interests line is capitalised,
 * because it reads as a sentence.
 * @param {Family} family
 */
function familyRows(family) {
  /** @type {{ field: string, label: string, value: string, aside?: string }[]} */
  const rows = family.kids.map((kid, index) =>
    kid.age == null
      ? { field: `kids.${index}`, label: 'Chicos', value: kid.name, aside: '· sin edad' }
      : { field: `kids.${index}`, label: 'Chicos', value: `${kid.name} · ${ageText(kid.age)}` },
  )
  if (family.pet) rows.push({ field: 'pet', label: 'Mascota', value: family.pet })
  if (family.interests.length > 0) {
    const interests = family.interests.join(' · ')
    rows.push({ field: 'interests', label: 'Le encanta', value: interests[0].toUpperCase() + interests.slice(1) })
  }
  if (family.toys.length > 0) rows.push({ field: 'toys', label: 'Juguetes', value: family.toys.map((toy) => toy.name).join(' · ') })
  return rows
}
