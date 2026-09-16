import { loadMaterials, markMaterial, saveMaterial } from '../api'
import { failureText } from '../../../shared/format'
import { useSerialSaves } from '../../../shared/hooks/useSerialSaves'
import { Chips, ChipToggle, FieldGroup, Skeleton } from '../../../shared/ui'
import '../materials.css'

/** @typedef {import('../types').Material} Material */
/** @typedef {import('../types').MaterialCategory} MaterialCategory */

/**
 * The materials, a group of chips per category, each saved on its tap. Taps
 * save one after another, like who's playing on Home. A failed save says so
 * and reloads the list, so the chips show what was really saved.
 * Placeholders while this device doesn't have the list yet.
 * @param {{
 *   categories: MaterialCategory[] | null,
 *   offline: { online: boolean, tap: () => void },
 *   onFailure: (text: string | null) => void,
 * }} props
 */
export function MaterialGroups({ categories, offline, onFailure }) {
  const saves = useSerialSaves()

  /** @param {Material} material */
  const toggle = (material) => {
    if (!offline.online) return offline.tap()
    const have = !material.have
    markMaterial(material.key, have)
    onFailure(null)
    saves.add(
      () => saveMaterial(material.key, have),
      (error) => {
        onFailure(failureText(error))
        return loadMaterials().catch(() => {})
      },
    )
  }

  if (!categories) {
    return (
      <div className="materials__groups" aria-hidden="true">
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
    )
  }
  return (
    <div className="materials__groups">
      {categories.map((category) => (
        <FieldGroup key={category.key} label={category.label}>
          <Chips>
            {category.materials.map((material) => (
              <ChipToggle key={material.key} pressed={material.have} onClick={() => toggle(material)}>
                {material.label}
              </ChipToggle>
            ))}
          </Chips>
        </FieldGroup>
      ))}
    </div>
  )
}
