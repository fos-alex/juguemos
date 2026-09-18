import { useEffect, useId, useRef } from 'react'
import { CloseIcon } from './Icons'
import './Sheet.css'

/**
 * A panel that rises from the bottom over a scrim, in the thumb zone, for a
 * few choices that belong to the screen under it (JUG-31). Like the Drawer,
 * it is the native modal dialog, so focus, Escape, and the backdrop come for
 * free, and tapping the scrim closes it. `footer` holds its actions, under
 * what scrolls.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title: string,
 *   footer?: React.ReactNode,
 *   children: React.ReactNode,
 * }} props
 */
export function Sheet({ open, onClose, title, footer, children }) {
  const ref = useRef(/** @type {HTMLDialogElement | null} */ (null))
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__head">
          <h2 id={titleId} className="sheet__title">
            {title}
          </h2>
          <button type="button" className="sheet__close" aria-label="Cerrar" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </dialog>
  )
}
