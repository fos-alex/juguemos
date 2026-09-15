import assert from 'node:assert/strict'
import { test } from 'node:test'
import { jsonIn, render } from '../../src/llm/prompt.js'

test('a prompt is filled with the values it asks for', () => {
  assert.equal(render('Los chicos: {{kids}}. La mascota: {{pet}}.', { kids: 'Milán', pet: 'Inca' }), 'Los chicos: Milán. La mascota: Inca.')
  assert.equal(render('{{kid}} y {{kid}}', { kid: 'Milán' }), 'Milán y Milán')
  assert.equal(render('sin marcadores', {}), 'sin marcadores')
})

test('a placeholder with no value throws, so no story says it out loud', () => {
  assert.throws(() => render('Los chicos: {{kids}}.', {}), /{{kids}}/)
})

test('the JSON in an answer is read, fenced or not', () => {
  assert.deepEqual(jsonIn('{"a":1}'), { a: 1 })
  assert.deepEqual(jsonIn('```json\n{"a":1}\n```'), { a: 1 })
  assert.deepEqual(jsonIn('```\n[{"title":"Un tren"}]\n```'), [{ title: 'Un tren' }])
})

test('an object and an array are both read, wherever they sit in the answer', () => {
  assert.deepEqual(jsonIn('Acá van las tramas:\n[1, 2, 3]\nEso es todo.'), [1, 2, 3])
  assert.deepEqual(jsonIn('{ "tramas": [{ "title": "Un tren" }] }'), { tramas: [{ title: 'Un tren' }] })
})

test('an answer with no JSON, or with broken JSON, is null', () => {
  assert.equal(jsonIn('No encontré ninguna familia.'), null)
  assert.equal(jsonIn(''), null)
  assert.equal(jsonIn('{"a": '), null)
  assert.equal(jsonIn('{no es json}'), null)
})
