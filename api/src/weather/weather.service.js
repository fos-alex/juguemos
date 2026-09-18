/**
 * The weather behind a suggestion (JUG-25). It asks the provider what the
 * next few hours look like where the family lives, reads that into `fine`,
 * `fair` or `poor` (conditions.js), and hands it to the ranking, which offers
 * a juego outside on a good afternoon and one inside when it rains.
 *
 * **It never fails a suggestion.** A family that hasn't said where they live,
 * a provider that is down, and a request that takes too long all answer null,
 * and the ranking then works exactly as it did before the weather existed.
 * ¡Juguemos! is one tap and has to answer.
 *
 * **Cached per location, on the server** (docs/architecture.md), not per
 * family: the forecast is the same for everyone in a city, and the key is the
 * coordinates rounded to about a kilometre, so one call covers a whole
 * neighbourhood. Nothing about which family asked is kept, here or in a log.
 */
import { conditionsFor } from './conditions.js'

/** @typedef {import('./conditions.js').Conditions} Conditions */
/** @typedef {import('./open-meteo.js').Forecaster} Forecaster */
/** @typedef {import('./open-meteo.js').Place} Place */
/** @typedef {ReturnType<typeof createWeatherService>} WeatherService */

/** Decimal places the cache key keeps: two is about a kilometre. */
const PRECISION = 2

/**
 * How long a location waits after a failed read, so a provider that is down
 * costs one wait a minute rather than one on every tap.
 */
const RETRY_MS = 60_000

/**
 * @param {{
 *   forecaster: Forecaster | null,
 *   cacheMs: number,
 *   logger?: { warn: (message: string) => void },
 *   now?: () => Date,
 * }} deps `forecaster` is null when this server reads no weather, and then
 *   every answer is null.
 */
export function createWeatherService({ forecaster, cacheMs, logger, now = () => new Date() }) {
  /**
   * What each location last came back as, and until when. A `null` entry is a
   * read that failed, kept briefly so the next tap doesn't wait again.
   * @type {Map<string, { conditions: Conditions | null, until: number }>}
   */
  const cache = new Map()
  /** The calls already out, so two taps at once ask the provider once. @type {Map<string, Promise<Conditions>>} */
  const asking = new Map()

  return {
    /**
     * What the weather says about playing outside where this family lives, or
     * null when there is nothing to say.
     * @param {Place | null} place where the family is, or null until they say
     * @returns {Promise<Conditions | null>}
     */
    async conditionsAt(place) {
      if (!forecaster || !place) return null
      const key = `${place.latitude.toFixed(PRECISION)},${place.longitude.toFixed(PRECISION)}`
      const at = now().getTime()

      const cached = cache.get(key)
      if (cached && cached.until > at) return cached.conditions

      let pending = asking.get(key)
      if (!pending) {
        pending = forecaster
          .read(place)
          .then(conditionsFor)
          .finally(() => asking.delete(key))
        asking.set(key, pending)
      }
      try {
        const conditions = await pending
        cache.set(key, { conditions, until: now().getTime() + cacheMs })
        return conditions
      } catch (error) {
        // The juego is offered without it. The message names the failure and
        // never the place, which is where a family lives.
        logger?.warn(`The weather could not be read: ${/** @type {Error} */ (error).message}`)
        cache.set(key, { conditions: null, until: now().getTime() + Math.min(cacheMs, RETRY_MS) })
        return null
      }
    },
  }
}
