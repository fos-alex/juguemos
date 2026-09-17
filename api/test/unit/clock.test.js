import assert from 'node:assert/strict'
import { test } from 'node:test'
import { moodAt } from '../../src/clock.js'

test('the moment follows the Buenos Aires clock, whatever the server is set to', () => {
  assert.equal(moodAt(new Date('2026-09-14T21:00:00-03:00')), 'calm')
  assert.equal(moodAt(new Date('2026-09-14T20:00:00Z')), 'lively')
  // The ends of the window: 19:00 is already calm, 07:00 is not any more.
  assert.equal(moodAt(new Date('2026-09-14T19:00:00-03:00')), 'calm')
  assert.equal(moodAt(new Date('2026-09-14T18:59:00-03:00')), 'lively')
  assert.equal(moodAt(new Date('2026-09-14T06:59:00-03:00')), 'calm')
  assert.equal(moodAt(new Date('2026-09-14T07:00:00-03:00')), 'lively')
})
