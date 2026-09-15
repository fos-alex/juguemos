import { useEffect, useRef } from 'react'
import './Drawer.css'

/**
 * A side panel over a scrim, on the native modal dialog so focus, Escape, and
 * the backdrop come for free. Tapping the scrim closes it.
 * @param {{ open: boolean, onClose: () => void, label: string, children: React.ReactNode }} props
 */
export function Drawer({ open, onClose, label, children }) {
  const ref = useRef(/** @type {HTMLDialogElement | null} */ (null))

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="drawer__panel">{children}</div>
    </dialog>
  )
}
