import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readToysUnderstanding } from '../../src/toys/understanding.js'

test('keeps names as written and descriptions trimmed', () => {
  const answer = JSON.stringify({ toys: [{ name: 'el Tren grandote', description: '  tren de madera grande  ' }] })
  const text = 'Tiene el tren grandote de madera, es grande.'
  // asWritten finds it regardless of case; the slice keeps the parent spelling.
  const understood = readToysUnderstanding(answer, text)
  assert.equal(understood?.toys[0].name, 'el tren grandote')
  assert.equal(understood?.toys[0].description, 'tren de madera grande')
})

test('empty and unreadable answers', () => {
  assert.deepEqual(readToysUnderstanding(JSON.stringify({ toys: [] }), 'hola'), { toys: [] })
  assert.equal(readToysUnderstanding('no sé', 'hola'), null)
})
