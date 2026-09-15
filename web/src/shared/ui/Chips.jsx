import { AS_TYPED } from './Field'
import './Chips.css'

/**
 * A row of chips. `items` become chips that a tap removes (the interests and
 * a toy's other names); whatever else goes in `children`, such as toggles or
 * the add input, follows them.
 * @param {{
 *   items?: string[],
 *   onRemove?: (index: number) => void,
 *   className?: string,
 *   children?: React.ReactNode,
 * }} props
 */
export function Chips({ items = [], onRemove, className = '', children }) {
  return (
    <div className={`chips ${className}`.trim()}>
      {items.map((item, index) => (
        <button
          key={`${item}-${index}`}
          type="button"
          className="chip"
          aria-label={`Quitar ${item}`}
          onClick={() => onRemove?.(index)}
        >
          {item} <span aria-hidden="true">×</span>
        </button>
      ))}
      {children}
    </div>
  )
}

/**
 * A chip that stays pressed: filled with a check when on and outlined when
 * off, so colour is never the only difference. Other button attributes pass
 * through, like `aria-disabled` for the last kid playing.
 * @param {{ pressed: boolean, onClick: () => void, children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function ChipToggle({ pressed, onClick, children, ...rest }) {
  return (
    <button type="button" className="chip chip--toggle" aria-pressed={pressed} onClick={onClick} {...rest}>
      {pressed && (
        <span className="chip__check" aria-hidden="true">
          ✓
        </span>
      )}
      {children}
    </button>
  )
}

/**
 * The dashed + chip that turns into an input for one more item. The draft
 * belongs to the screen (`null` shows the + chip), so a save can include what
 * is still being typed. Blur or Enter commits it. The family's words stay as
 * typed.
 * @param {{
 *   value: string | null,
 *   onChange: (value: string | null) => void,
 *   onCommit: () => void,
 *   addLabel: string,
 *   inputLabel: string,
 *   field?: string,
 *   maxLength?: number,
 * }} props
 * `field` goes on the + chip as `data-field`, so `?campo=` can focus it.
 */
export function ChipInput({ value, onChange, onCommit, addLabel, inputLabel, field, maxLength }) {
  if (value === null) {
    return (
      <button type="button" className="chip chip--add" data-field={field} aria-label={addLabel} onClick={() => onChange('')}>
        +
      </button>
    )
  }
  return (
    <input
      className="chip chip--input"
      aria-label={inputLabel}
      autoFocus
      maxLength={maxLength}
      {...AS_TYPED}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onCommit()
        }
      }}
    />
  )
}
