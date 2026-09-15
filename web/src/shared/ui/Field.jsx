import { useId } from 'react'
import './Field.css'

/** Input attributes for the family's own words: nobody corrects their family's names, so the keyboard keeps its hands off. */
export const AS_TYPED = { autoCorrect: 'off', autoCapitalize: 'none', spellCheck: false }

/**
 * A labelled text field. Errors sit under the field that caused them, in
 * words, and replace the helper line while they apply.
 * @param {{
 *   label: string,
 *   help?: string,
 *   error?: string | null,
 *   trailing?: React.ReactNode,
 *   suffix?: string,
 *   className?: string,
 * } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
export function Field({ label, help, error, trailing, suffix, className = '', ...input }) {
  const id = useId()
  const noteId = `${id}-note`
  const note = error || help

  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <FieldControl
        id={id}
        trailing={trailing}
        suffix={suffix}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        {...input}
      />
      {note && (
        <p id={noteId} className={error ? 'field__error' : 'field__help'}>
          {note}
        </p>
      )}
    </div>
  )
}

/**
 * Several controls under one label, such as a row of chips or the kids'
 * rows. Help and error lines go in `children`, after the controls.
 * @param {{ label: string, className?: string, children: React.ReactNode }} props
 */
export function FieldGroup({ label, className = '', children }) {
  const id = useId()
  return (
    <div className={`field ${className}`.trim()} role="group" aria-labelledby={id}>
      <p id={id} className="field__label">
        {label}
      </p>
      {children}
    </div>
  )
}

/**
 * The bordered input on its own, for fields that share one label (the kids'
 * name and age, the list of toys).
 * @param {{ trailing?: React.ReactNode, suffix?: string } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
export function FieldControl({ trailing, suffix, className = '', ...input }) {
  return (
    <div className={`field__control ${className}`}>
      <input className="field__input" {...input} />
      {suffix && (
        <span className="field__suffix" aria-hidden="true">
          {suffix}
        </span>
      )}
      {trailing}
    </div>
  )
}
