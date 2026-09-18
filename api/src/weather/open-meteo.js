/**
 * The weather provider (JUG-25): Open-Meteo, which needs no account and no
 * key, so a fresh checkout has the weather without any setting. It is the
 * thin interface architecture.md asks every external service to sit behind:
 * it answers with the hours conditions.js reads and nothing provider-shaped
 * leaks past it, so another provider is this file alone.
 *
 * **The coordinates say where a family lives, so they never reach a log.**
 * A failure is an `UpstreamError` naming what went wrong and never the URL,
 * which carries them.
 */
import { UpstreamError } from '../errors.js'
import { LIMITS } from './conditions.js'

/** @typedef {import('../config.js').WeatherConfig} WeatherConfig */
/** @typedef {import('./conditions.js').Forecast} Forecast */
/** @typedef {{ latitude: number, longitude: number }} Place */
/**
 * @typedef {object} Forecaster
 * @property {(place: Place) => Promise<Forecast>} read now and the next few hours there
 */

/**
 * ¡Juguemos! is one tap and the juego is offered with or without the weather,
 * so the forecast gets far less time than a story: past this it is dropped and
 * the ranking carries on without it.
 */
const TIMEOUT_MS = 3000

/** What each hour is asked for, in the order the answer's arrays come back in. */
const HOURLY = ['apparent_temperature', 'precipitation', 'precipitation_probability', 'weather_code', 'wind_speed_10m']

/** @param {{ config: WeatherConfig }} deps @returns {Forecaster} */
export function createForecaster({ config }) {
  const url = `${config.url.replace(/\/$/, '')}/forecast`

  return {
    async read({ latitude, longitude }) {
      const query = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        hourly: HOURLY.join(','),
        forecast_hours: String(LIMITS.hours),
        // The times are never read, so there is no time zone to get right.
        timezone: 'UTC',
      })
      const response = await fetch(`${url}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((error) => {
        // Only the kind of failure: the message can hold the URL, and the URL
        // holds where the family lives.
        throw new UpstreamError(`The weather service is unreachable (${error.name})`)
      })
      if (!response.ok) throw new UpstreamError(`The weather service answered HTTP ${response.status}`)
      const data = /** @type {{ hourly?: Record<string, unknown> } | null} */ (await response.json().catch(() => null))
      const hours = hoursIn(data?.hourly)
      if (hours.length === 0) throw new UpstreamError('The weather service answered with no hours')
      return { hours }
    },
  }
}

/**
 * The answer's parallel arrays as one object per hour, keeping only the hours
 * that came back whole: a provider that drops a value must not become a
 * forecast of NaN, which would read as a lovely day.
 * @param {Record<string, unknown> | undefined} hourly
 * @returns {import('./conditions.js').Hour[]}
 */
function hoursIn(hourly) {
  const numbers = (/** @type {string} */ key) => (Array.isArray(hourly?.[key]) ? hourly[key] : [])
  const [temperature, rain, rainChance, code, wind] = HOURLY.map(numbers)
  return temperature
    .map((_, at) => ({
      temperature: temperature[at],
      rain: rain[at],
      rainChance: rainChance[at],
      code: code[at],
      wind: wind[at],
    }))
    .filter((hour) => Object.values(hour).every((value) => typeof value === 'number' && Number.isFinite(value)))
}
