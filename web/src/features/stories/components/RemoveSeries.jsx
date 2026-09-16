import { SecondaryButton, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../stories.css'

/**
 * "Ya no la seguimos", and the question it asks before a series goes. The
 * stories themselves stay, so the question says that instead of warning.
 * @param {{
 *   confirming: boolean,
 *   removing: boolean,
 *   onAsk: () => void,
 *   onCancel: () => void,
 *   onRemove: () => void,
 * }} props
 */
export function RemoveSeries({ confirming, removing, onAsk, onCancel, onRemove }) {
  if (!confirming) {
    return (
      /* Voice pass pending: "Ya no la seguimos". */
      <TertiaryButton size="inline" onClick={onAsk}>
        Ya no la seguimos
      </TertiaryButton>
    )
  }
  return (
    <div className="series__remove" role="group" aria-labelledby="remove-series-label">
      {/* Voice pass pending: the question. */}
      <StatusLine id="remove-series-label">¿Dejamos la serie? Los cuentos quedan para volver a leer.</StatusLine>
      <div className="button-row">
        <SecondaryButton size="sm" className="grow" busy={removing} busyLabel="Dejándola" onClick={onRemove}>
          Sí, dejarla
        </SecondaryButton>
        <TertiaryButton disabled={removing} onClick={onCancel}>
          No
        </TertiaryButton>
      </div>
    </div>
  )
}
