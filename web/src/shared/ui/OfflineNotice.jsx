/**
 * The offline line, shown only while offline. It takes `useOfflineNotice()`'s
 * value; each tap made offline remounts the line, so it is announced again
 * and its fade plays again.
 * @param {{
 *   notice: { online: boolean, taps: number },
 *   className?: string,
 *   children?: React.ReactNode,
 * }} props
 */
export function OfflineNotice({ notice, className = 'status-line', children = 'Estás sin conexión.' }) {
  if (notice.online) return null
  return (
    <p key={notice.taps} className={className} role="status">
      {children}
    </p>
  )
}
