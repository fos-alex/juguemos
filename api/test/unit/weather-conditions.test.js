import assert from 'node:assert/strict'
import { test } from 'node:test'
import { conditionsFor, LIMITS } from '../../src/weather/conditions.js'

/** One hour of a spring afternoon in Buenos Aires: the plaza, with nothing in the way. */
const hour = (/** @type {Partial<import('../../src/weather/conditions.js').Hour>} */ overrides = {}) => ({
  temperature: 22,
  rain: 0,
  rainChance: 0,
  wind: 12,
  code: 0,
  ...overrides,
})

/** A forecast of the same hour, all the way through the window. */
const steady = (/** @type {Partial<import('../../src/weather/conditions.js').Hour>} */ overrides = {}) => ({
  hours: Array.from({ length: LIMITS.hours }, () => hour(overrides)),
})

test('a mild, clear afternoon is a fine one to be outside', () => {
  assert.deepEqual(conditionsFor(steady()), { weather: 'fine', reason: 'clear' })
  // Overcast is still fine: a grey spring day is no reason to stay in.
  assert.equal(conditionsFor(steady({ code: 3 })).weather, 'fine')
})

test('rain sends the family inside, whether it is falling or on its way', () => {
  assert.deepEqual(conditionsFor(steady({ rain: LIMITS.raining })), { weather: 'poor', reason: 'rain' })
  assert.deepEqual(conditionsFor(steady({ rainChance: LIMITS.rainChance })), { weather: 'poor', reason: 'rain' })
  // A thunderstorm says so by its own name.
  assert.deepEqual(conditionsFor(steady({ code: 95 })), { weather: 'poor', reason: 'storm' })
})

test('heat and cold send them inside too', () => {
  assert.deepEqual(conditionsFor(steady({ temperature: LIMITS.tooHot })), { weather: 'poor', reason: 'heat' })
  assert.deepEqual(conditionsFor(steady({ temperature: LIMITS.tooCold })), { weather: 'poor', reason: 'cold' })
  // In between, neither: warm for a jumper, not enough to decide anything.
  assert.equal(conditionsFor(steady({ temperature: LIMITS.warmEnough - 1 })).weather, 'fair')
  assert.equal(conditionsFor(steady({ temperature: LIMITS.coolEnough + 1 })).weather, 'fair')
})

test('wind blows a game over before it takes a day away', () => {
  assert.deepEqual(conditionsFor(steady({ wind: LIMITS.windy })), { weather: 'poor', reason: 'wind' })
  assert.deepEqual(conditionsFor(steady({ wind: LIMITS.breezy + 1 })), { weather: 'fair', reason: 'wind' })
  assert.equal(conditionsFor(steady({ wind: LIMITS.breezy })).weather, 'fine')
})

test('fog is neither: it says so, and changes nothing', () => {
  assert.deepEqual(conditionsFor(steady({ code: 45 })), { weather: 'fair', reason: 'fog' })
})

test('the worst hour in the window decides, since the rain arrives while they are out', () => {
  const turning = { hours: [hour(), hour(), hour({ rainChance: 90 }), hour({ rainChance: 90 })] }
  assert.deepEqual(conditionsFor(turning), { weather: 'poor', reason: 'rain' })

  // And an hour past the window doesn't: a juego is over by then.
  const later = { hours: [...Array.from({ length: LIMITS.hours }, () => hour()), hour({ rainChance: 90 })] }
  assert.equal(conditionsFor(later).weather, 'fine')
})

test('a forecast with no hours says nothing, rather than guessing a lovely day', () => {
  assert.deepEqual(conditionsFor({ hours: [] }), { weather: 'fair', reason: 'grey' })
})
