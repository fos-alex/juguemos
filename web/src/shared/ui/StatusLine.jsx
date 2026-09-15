import './StatusLine.css'

/**
 * A one-line message in the screen's body: a failure (`role="alert"`), news
 * the screen reader should hear (`role="status"`), or a plain note with no
 * role. Renders nothing when there is nothing to say.
 * @param {{ role?: 'status' | 'alert', id?: string, className?: string, children?: React.ReactNode }} props
 */
export function StatusLine({ role, id, className = '', children }) {
  if (children == null || children === false || children === '') return null
  return (
    <p id={id} className={`status-line ${className}`.trim()} role={role}>
      {children}
    </p>
  )
}
