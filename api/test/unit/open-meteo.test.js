import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, beforeEach, test } from 'node:test'
import { UpstreamError } from '../../src/errors.js'
import { LIMITS } from '../../src/weather/conditions.js'
import { createForecaster } from '../../src/weather/open-meteo.js'

/** What the fake service was asked, in order. @type {URLSearchParams[]} */
let asked = []
/** How it answers the next request. @type {(response: import('node:http').ServerResponse) => void} */
let answer = () => {}

/** @type {import('node:http').Server} */
let server
/** @type {string} */
let baseUrl

before(async () => {
  server = createServer((request, response) => {
    asked.push(new URL(request.url ?? '', 'http://weather.local').searchParams)
    answer(response)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)))
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address())
  baseUrl = `http://127.0.0.1:${port}/v1`
})
after(() => server.close())
beforeEach(() => {
  asked = []
})

/** @param {object} body */
const json = (body) => (/** @type {import('node:http').ServerResponse} */ response) => {
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

const CABA = { latitude: -34.61315, longitude: -58.37723 }

const forecaster = () => createForecaster({ config: { url: baseUrl, cacheMs: 0 } })

/** An answer shaped the way Open-Meteo sends it: one array per field. */
const hourly = (/** @type {Record<string, unknown[]>} */ fields) => ({
  hourly: {
    time: ['2026-09-17T19:00', '2026-09-17T20:00'],
    apparent_temperature: [22, 21],
    precipitation: [0, 0],
    precipitation_probability: [0, 10],
    weather_code: [0, 3],
    wind_speed_10m: [12, 14],
    ...fields,
  },
})

test('the hours come back as one object each, asked for where the family lives', async () => {
  answer = json(hourly({}))
  const forecast = await forecaster().read(CABA)
  assert.deepEqual(forecast.hours, [
    { temperature: 22, rain: 0, rainChance: 0, code: 0, wind: 12 },
    { temperature: 21, rain: 0, rainChance: 10, code: 3, wind: 14 },
  ])

  assert.equal(asked[0].get('latitude'), String(CABA.latitude))
  assert.equal(asked[0].get('longitude'), String(CABA.longitude))
  assert.equal(asked[0].get('forecast_hours'), String(LIMITS.hours))
})

test('an hour missing a value is dropped, so a gap never reads as a lovely day', async () => {
  answer = json(hourly({ precipitation_probability: [null, 10] }))
  const forecast = await forecaster().read(CABA)
  assert.equal(forecast.hours.length, 1)
  assert.equal(forecast.hours[0].rainChance, 10)
})

test('an answer with no hours at all is a failure, not an empty forecast', async () => {
  answer = json({ hourly: {} })
  await assert.rejects(() => forecaster().read(CABA), UpstreamError)
})

test('a service that refuses fails without saying where the family lives', async () => {
  answer = (response) => {
    response.writeHead(500)
    response.end('nope')
  }
  const failed = await forecaster()
    .read(CABA)
    .catch((error) => error)
  assert.ok(failed instanceof UpstreamError)
  assert.ok(!failed.message.includes('34.6'), 'the coordinates say where a family lives')
})
