import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, beforeEach, test } from 'node:test'
import { asKnown, createGeocoder } from '../../src/places/geocoder.js'
import { UpstreamError } from '../../src/errors.js'

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
    asked.push(new URL(request.url ?? '', 'http://places.local').searchParams)
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

const BUENOS_AIRES = { results: [{ name: 'Buenos Aires', latitude: -34.61315, longitude: -58.37723 }] }

const geocoder = () => createGeocoder({ config: { url: baseUrl } })

test('the family\'s words become coordinates, looked for in Argentina first', async () => {
  answer = json(BUENOS_AIRES)
  assert.deepEqual(await geocoder().locate('La Plata'), { latitude: -34.61315, longitude: -58.37723 })
  assert.equal(asked.length, 1)
  assert.equal(asked[0].get('name'), 'La Plata')
  assert.equal(asked[0].get('countryCode'), 'AR')
})

test('what Argentines call their city is what the geocoder is asked for', () => {
  // GeoNames has no "Capital Federal", and a parent here writes that long
  // before they write "Buenos Aires" (JUG-25).
  assert.equal(asKnown('Capital Federal'), 'Buenos Aires')
  assert.equal(asKnown('  capital   federal '), 'Buenos Aires')
  assert.equal(asKnown('CABA'), 'Buenos Aires')
  assert.equal(asKnown('Ciudad Autónoma de Buenos Aires'), 'Buenos Aires')
  // Anything else goes as the parent wrote it, spacing tidied.
  assert.equal(asKnown('Mar  del Plata'), 'Mar del Plata')
  assert.equal(asKnown('   '), '')
})

test('a name found nowhere is no place, and the country is not the only try', async () => {
  answer = json({ results: [] })
  assert.equal(await geocoder().locate('Nunquistán'), null)
  // Argentina first, then anywhere: a family abroad is still placed.
  assert.deepEqual(
    asked.map((query) => query.get('countryCode')),
    ['AR', null],
  )

  // Nothing to look for asks nobody.
  asked = []
  assert.equal(await geocoder().locate('  '), null)
  assert.equal(asked.length, 0)
})

test('an answer without usable coordinates is no place either', async () => {
  answer = json({ results: [{ name: 'Sin lugar', latitude: null, longitude: -58.4 }] })
  assert.equal(await geocoder().locate('Sin lugar'), null)
})

test('a service that refuses fails loudly, without the words in the message', async () => {
  answer = (response) => {
    response.writeHead(503)
    response.end('busy')
  }
  const failed = await geocoder()
    .locate('Villa Crespo')
    .catch((error) => error)
  assert.ok(failed instanceof UpstreamError)
  assert.ok(!failed.message.includes('Villa Crespo'), 'the family\'s own words must never reach a log')
})
