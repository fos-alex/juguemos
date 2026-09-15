import { SecondaryButton, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../toys.css'

/**
 * "Ya no lo tenemos", and the question it asks before the toy leaves the box
 * for good. There is no undo, so the question says so.
 * @param {{
 *   confirming: boolean,
 *   removing: boolean,
 *   disabled: boolean,
 *   onAsk: () => void,
 *   onCancel: () => void,
 *   onRemove: () => void,
 * }} props
 */
export function RemoveToy({ confirming, removing, disabled, onAsk, onCancel, onRemove }) {
  if (!confirming) {
    return (
      <TertiaryButton size="inline" disabled={disabled} onClick={onAsk}>
        Ya no lo tenemos
      </TertiaryButton>
    )
  }
  return (
    <div className="toy-form__remove" role="group" aria-labelledby="remove-label">
      <StatusLine id="remove-label">¿Lo sacamos del baúl? No se puede deshacer.</StatusLine>
      <div className="button-row">
        <SecondaryButton size="sm" className="grow" busy={removing} busyLabel="Sacándolo" onClick={onRemove}>
          Sí, sacarlo
        </SecondaryButton>
        <TertiaryButton disabled={removing} onClick={onCancel}>
          No
        </TertiaryButton>
      </div>
    </div>
  )
}
