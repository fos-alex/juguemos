import assert from 'node:assert/strict'
import { test } from 'node:test'
import { moodAt, nightAt } from '../../src/clock.js'

test('the moment follows the Buenos Aires clock, whatever the server is set to', () => {
  assert.equal(moodAt(new Date('2026-09-14T21:00:00-03:00')), 'calm')
  assert.equal(moodAt(new Date('2026-09-14T20:00:00Z')), 'lively')
  // The ends of the window: 19:00 is already calm, 07:00 is not any more.
  assert.equal(moodAt(new Date('2026-09-14T19:00:00-03:00')), 'calm')
  assert.equal(moodAt(new Date('2026-09-14T18:59:00-03:00')), 'lively')
  assert.equal(moodAt(new Date('2026-09-14T06:59:00-03:00')), 'calm')
  assert.equal(moodAt(new Date('2026-09-14T07:00:00-03:00')), 'lively')
})

test('night starts at 19:00, at 18:00 in winter, and ends at 07:00, on the Buenos Aires clock', () => {
  assert.equal(nightAt(new Date('2026-09-14T18:59:00-03:00')), false)
  assert.equal(nightAt(new Date('2026-09-14T19:00:00-03:00')), true)
  assert.equal(nightAt(new Date('2026-09-15T06:59:00-03:00')), true)
  assert.equal(nightAt(new Date('2026-09-15T07:00:00-03:00')), false)
  // June, July, and August get dark an hour earlier.
  assert.equal(nightAt(new Date('2026-07-10T17:59:00-03:00')), false)
  assert.equal(nightAt(new Date('2026-07-10T18:00:00-03:00')), true)
  assert.equal(nightAt(new Date('2026-05-31T18:30:00-03:00')), false)
  assert.equal(nightAt(new Date('2026-06-01T18:30:00-03:00')), true)
  // 21:00 UTC is 18:00 in Buenos Aires, whatever the server is set to.
  assert.equal(nightAt(new Date('2026-08-31T21:00:00Z')), true)
  assert.equal(nightAt(new Date('2026-09-01T21:00:00Z')), false)
})
