import { useId } from 'react'

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
