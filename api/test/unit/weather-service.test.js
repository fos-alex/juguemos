import assert from 'node:assert/strict'
import { test } from 'node:test'
import { UpstreamError } from '../../src/errors.js'
import { LIMITS } from '../../src/weather/conditions.js'
import { createWeatherService } from '../../src/weather/weather.service.js'

const CABA = { latitude: -34.61315, longitude: -58.37723 }
/** The same city, a few blocks over: the forecast is the same and so is the cache entry. */
const NEARBY = { latitude: -34.6134, longitude: -58.3774 }
const CORDOBA = { latitude: -31.40648, longitude: -64.18853 }

const CACHE_MS = 900_000

/** A forecaster that counts its calls and answers the same clear afternoon. */
function forecasting(hour = { temperature: 22, rain: 0, rainChance: 0, wind: 12, code: 0 }) {
  /** @type {{ latitude: number, longitude: number }[]} */
  const reads = []
  return {
    reads,
    /** @param {{ latitude: number, longitude: number }} place */
    async read(place) {
      reads.push(place)
      return { hours: Array.from({ length: LIMITS.hours }, () => hour) }
    },
  }
}

/** A clock the test moves by hand. */
function clock(start = new Date('2026-09-17T15:00:00Z')) {
  let at = start
  return { now: () => at, pass: (/** @type {number} */ ms) => (at = new Date(at.getTime() + ms)) }
}

test('the forecast is read once per location and kept', async () => {
  const forecaster = forecasting()
  const { now, pass } = clock()
  const weather = createWeatherService({ forecaster, cacheMs: CACHE_MS, now })

  assert.deepEqual(await weather.conditionsAt(CABA), { weather: 'fine', reason: 'clear' })
  // A second family a few blocks away shares the entry: the weather is a city's, not a home's.
  assert.deepEqual(await weather.conditionsAt(NEARBY), { weather: 'fine', reason: 'clear' })
  assert.equal(forecaster.reads.length, 1)

  // Another city is its own.
  await weather.conditionsAt(CORDOBA)
  assert.equal(forecaster.reads.length, 2)

  // And the entry goes stale.
  pass(CACHE_MS + 1)
  await weather.conditionsAt(CABA)
  assert.equal(forecaster.reads.length, 3)
})

test('two taps at once ask the provider once', async () => {
  const forecaster = forecasting()
  const weather = createWeatherService({ forecaster, cacheMs: CACHE_MS })
  const [first, second] = await Promise.all([weather.conditionsAt(CABA), weather.conditionsAt(CABA)])
  assert.deepEqual(first, second)
  assert.equal(forecaster.reads.length, 1)
})

test('a family that has not said where they live has no weather, and nobody is asked', async () => {
  const forecaster = forecasting()
  const weather = createWeatherService({ forecaster, cacheMs: CACHE_MS })
  assert.equal(await weather.conditionsAt(null), null)
  assert.equal(forecaster.reads.length, 0)

  // And neither does a server that reads no weather at all.
  assert.equal(await createWeatherService({ forecaster: null, cacheMs: CACHE_MS }).conditionsAt(CABA), null)
})

test('a provider that fails never fails the juego, and never logs where the family lives', async () => {
  /** @type {string[]} */
  const warnings = []
  let reads = 0
  const { now, pass } = clock()
  const weather = createWeatherService({
    forecaster: {
      async read() {
        reads += 1
        throw new UpstreamError('The weather service answered HTTP 503')
      },
    },
    cacheMs: CACHE_MS,
    logger: { warn: (message) => warnings.push(message) },
    now,
  })

  assert.equal(await weather.conditionsAt(CABA), null)
  assert.equal(warnings.length, 1)
  assert.ok(!warnings[0].includes('34.6'), 'the coordinates say where a family lives')

  // A provider that is down costs one wait a minute, not one on every tap.
  assert.equal(await weather.conditionsAt(CABA), null)
  assert.equal(reads, 1)

  pass(60_001)
  assert.equal(await weather.conditionsAt(CABA), null)
  assert.equal(reads, 2)
})
