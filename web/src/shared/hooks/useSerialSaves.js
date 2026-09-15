import { useMemo, useRef } from 'react'

/**
 * Saves made on each tap, one after another, so a quick second tap never
 * races the first. A request that depends on them, like asking for a juego
 * after choosing who plays, awaits `settled()` first.
 */
export function useSerialSaves() {
  const last = useRef(/** @type {Promise<unknown>} */ (Promise.resolve()))
  return useMemo(
    () => ({
      /**
       * Runs `save` after the saves before it. A failure goes to `onFailure`,
       * and the saves after it still run once whatever it returns settles.
       * @param {() => Promise<unknown>} save
       * @param {(error: unknown) => unknown} onFailure
       */
      add(save, onFailure) {
        last.current = last.current.then(save).catch(onFailure)
      },
      /** Resolves when every save added so far has finished, whether it worked or not. */
      settled() {
        return last.current
      },
    }),
    [],
  )
}
