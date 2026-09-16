import { KidCard } from './KidCard'
import { FieldGroup } from '../../../shared/ui'

/** @typedef {import('../model').FormState['kids']} Kids */

/**
 * The kids in the family form, a card each, and a link for one more. Every
 * card can be removed while there is more than one.
 * `drafts` holds the interest being typed on each kid's card, by position.
 * @param {{
 *   kids: Kids,
 *   drafts: Record<number, string | null>,
 *   onDraft: (index: number, draft: string | null) => void,
 *   onChange: (change: (kids: Kids) => Kids) => void,
 *   onRemove: (index: number) => void,
 * }} props
 */
export function KidCards({ kids, drafts, onDraft, onChange, onRemove }) {
  return (
    <FieldGroup label="Chicos">
      <div className="kid-cards">
        {kids.map((kid, index) => (
          <KidCard
            key={index}
            kid={kid}
            index={index}
            draft={drafts[index] ?? null}
            onDraft={(draft) => onDraft(index, draft)}
            onChange={(change) => onChange((all) => all.map((each, i) => (i === index ? change(each) : each)))}
            onRemove={kids.length > 1 ? () => onRemove(index) : undefined}
          />
        ))}
      </div>
      <button
        type="button"
        className="add-link"
        onClick={() => onChange((all) => [...all, { name: '', years: '', months: '', interests: [] }])}
      >
        + agregar otro chico
      </button>
    </FieldGroup>
  )
}
