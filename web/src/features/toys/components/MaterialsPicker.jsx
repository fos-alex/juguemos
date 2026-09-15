import { chooseMaterials, loadToyBox, markMaterials } from '../api'
import { failureText } from '../../../shared/format'
import { useSerialSaves } from '../../../shared/hooks/useSerialSaves'
import { Chips, ChipToggle, FieldGroup } from '../../../shared/ui'
import '../toys.css'

/** @typedef {import('../types').Material} Material */

/**
 * The household materials, each saved on its tap. Taps save one after
 * another, like who's playing on Home. A failed save says so and reloads the
 * box, so the chips show what was really saved.
 * @param {{
 *   materials: Material[],
 *   offline: { online: boolean, tap: () => void },
 *   onFailure: (text: string | null) => void,
 * }} props
 */
export function MaterialsPicker({ materials, offline, onFailure }) {
  const saves = useSerialSaves()

  /** @param {Material} material */
  const toggle = (material) => {
    if (!offline.online) return offline.tap()
    const next = materials.map((each) => (each.key === material.key ? { ...each, have: !each.have } : each))
    markMaterials(next)
    onFailure(null)
    const keys = next.filter((each) => each.have).map((each) => each.key)
    saves.add(
      () => chooseMaterials(keys),
      (error) => {
        onFailure(failureText(error))
        return loadToyBox().catch(() => {})
      },
    )
  }

  if (materials.length === 0) return null
  return (
    <FieldGroup label="También hay en casa" className="toy-box__materials">
      <Chips>
        {materials.map((material) => (
          <ChipToggle key={material.key} pressed={material.have} onClick={() => toggle(material)}>
            {material.label}
          </ChipToggle>
        ))}
      </Chips>
    </FieldGroup>
  )
}
