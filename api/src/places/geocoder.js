/**
 * Putting the family's own words for where they live on the map (JUG-25), so
 * the weather can be read there. Open-Meteo's geocoding service, which needs
 * no account and no key, behind the thin interface architecture.md asks for.
 *
 * **A city or a zone is all this is for.** The weather over Buenos Aires is
 * the same in every barrio, so nothing here tries to find a street, and the
 * coordinates it keeps are a city's, never a home's. Nothing ever asks the
 * device where it is.
 *
 * **The words are the family's own, and the coordinates say where they live,
 * so neither reaches a log,** here or in an error message.
 */
import { UpstreamError } from '../errors.js'

/** @typedef {import('../config.js').PlacesConfig} PlacesConfig */
/** @typedef {{ latitude: number, longitude: number }} Place */
/**
 * @typedef {object} Geocoder
 * @property {(name: string) => Promise<Place | null>} locate null when nobody could place the words
 */

/** A family save waits on this, so it gets little time. */
const TIMEOUT_MS = 5000

/**
 * What Argentines call their city, against the one name the geocoder knows it
 * by (its source is GeoNames, which has no "Capital Federal"). Local, not
 * translated (docs/constitution.md): a parent in Buenos Aires writes "Capital
 * Federal" or "CABA" long before they write "Buenos Aires". Matched without
 * case or accents.
 */
const ALSO_CALLED = {
  'capital federal': 'Buenos Aires',
  capital: 'Buenos Aires',
  caba: 'Buenos Aires',
  'ciudad de buenos aires': 'Buenos Aires',
  'ciudad autonoma de buenos aires': 'Buenos Aires',
  'buenos aires capital': 'Buenos Aires',
  'bs as': 'Buenos Aires',
  bsas: 'Buenos Aires',
  'bs. as.': 'Buenos Aires',
}

/** The country the geocoder looks in first. Version 1 is Argentina (README). */
const COUNTRY = 'AR'

/** @param {{ config: PlacesConfig }} deps @returns {Geocoder} */
export function createGeocoder({ config }) {
  const url = `${config.url.replace(/\/$/, '')}/search`

  return {
    async locate(name) {
      const wanted = asKnown(name)
      if (!wanted) return null
      // The country first, then anywhere: a family that moves abroad is still found.
      return (await search(url, wanted, COUNTRY)) ?? (await search(url, wanted, null))
    },
  }
}

/**
 * The name the geocoder knows, from the family's own words: trimmed, with the
 * extra spaces gone, and read through the local names above.
 * @param {string} name
 */
export function asKnown(name) {
  const written = name.trim().replace(/\s+/g, ' ')
  if (!written) return ''
  const plain = written
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
  return ALSO_CALLED[/** @type {keyof typeof ALSO_CALLED} */ (plain)] ?? written
}

/**
 * The best match for a name, in one country or anywhere.
 * @param {string} url
 * @param {string} name
 * @param {string | null} country
 * @returns {Promise<Place | null>}
 */
async function search(url, name, country) {
  const query = new URLSearchParams({ name, count: '1', language: 'es', format: 'json' })
  if (country) query.set('countryCode', country)
  const response = await fetch(`${url}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((error) => {
    // Only the kind of failure: the message can hold the URL, and the URL
    // holds the family's own words.
    throw new UpstreamError(`The geocoding service is unreachable (${error.name})`)
  })
  if (!response.ok) throw new UpstreamError(`The geocoding service answered HTTP ${response.status}`)
  const data = /** @type {{ results?: unknown } | null} */ (await response.json().catch(() => null))
  const [found] = Array.isArray(data?.results) ? data.results : []
  const { latitude, longitude } = found ?? {}
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
}
