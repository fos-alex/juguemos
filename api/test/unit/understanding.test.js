import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readUnderstanding } from '../../src/families/understanding.js'

// The design brief's example paragraph.
const TEXT =
  'Somos Alex y Caro, tenemos a Milán, de dos años, y a Inca, nuestra mascota. A Milán le encantan los dinosaurios y los caballos, y tiene un tren de madera que no suelta.'

/** @param {object} overrides */
const answer = (overrides = {}) =>
  JSON.stringify({
    kids: [{ name: 'Milán', age: 2 }],
    pets: [{ name: 'Inca' }],
    interests: ['los dinosaurios', 'los caballos'],
    toys: ['un tren de madera'],
    unsure: [],
    note: null,
    ...overrides,
  })

test('the example paragraph becomes the family, with nothing to check', () => {
  assert.deepEqual(readUnderstanding(answer(), TEXT), {
    family: {
      kids: [{ name: 'Milán', age: 2, interests: ['los dinosaurios', 'los caballos'] }],
      pets: [{ name: 'Inca' }],
      toys: [{ name: 'un tren de madera' }],
    },
    unsure: [],
    note: null,
  })
})

test('each kid gets what the text says they love, and what it leaves unclear goes to every kid', () => {
  const text =
    'Tenemos a Milán, de 2, y a Sofi, de 4. A Milán le encantan los dinosaurios, Sofi ama dibujar, y a los dos les gustan los trenes y la plaza.'
  const understood = readUnderstanding(
    answer({
      kids: [
        { name: 'Milán', age: 2, interests: ['los dinosaurios', 'los trenes'] },
        { name: 'Sofi', age: 4, interests: ['dibujar'] },
      ],
      interests: ['los trenes', 'la plaza'],
      // This text names no pet, and a pet it doesn't name would be flagged.
      pets: [],
    }),
    text,
  )
  assert.deepEqual(
    understood?.family.kids.map((kid) => [kid.name, kid.interests]),
    [
      ['Milán', ['los dinosaurios', 'los trenes', 'la plaza']],
      ['Sofi', ['dibujar', 'los trenes', 'la plaza']],
    ],
  )
  assert.deepEqual(understood?.unsure, [])
})

test('names keep the spelling the parent used, even when the model changes it', () => {
  const text = 'tenemos a milán y a inca, que juega con el osito'
  const understood = readUnderstanding(answer({ kids: [{ name: 'Milán', age: null }], toys: ['El Osito'] }), text)
  assert.equal(understood?.family.kids[0].name, 'milán')
  assert.equal(understood?.family.pets[0].name, 'inca')
  assert.deepEqual(understood?.family.toys, [{ name: 'el osito' }])
  assert.deepEqual(understood?.unsure, [])
})

test('a kid or pet the text does not name is flagged, with a note', () => {
  const understood = readUnderstanding(
    answer({ kids: [{ name: 'Milán', age: 2 }, { name: 'Sofía', age: 4 }], pets: [{ name: 'Firulais' }] }),
    TEXT,
  )
  assert.deepEqual(understood?.unsure.sort(), ['kids.1', 'pet'])
  assert.match(String(understood?.note), /Revisá lo marcado/)
})

test('the model doubts are kept, and follow a kid when an empty one is dropped', () => {
  const understood = readUnderstanding(
    answer({
      kids: [{ name: '', age: 3 }, { name: 'Milán', age: 2 }],
      unsure: ['kids.1', 'toys', 'otra cosa'],
      note: 'No me quedó claro si el tren es de Milán.',
    }),
    TEXT,
  )
  assert.deepEqual(understood?.family.kids, [{ name: 'Milán', age: 2, interests: ['los dinosaurios', 'los caballos'] }])
  assert.deepEqual(understood?.unsure.sort(), ['kids.0', 'toys'])
  assert.equal(understood?.note, 'No me quedó claro si el tren es de Milán.')
})

test('a second pet is flagged, since the card shows one', () => {
  const understood = readUnderstanding(answer({ pets: [{ name: 'Inca' }, { name: 'Milán' }] }), TEXT)
  assert.deepEqual(understood?.unsure, ['pet'])
})

test('ages are whole years from 0 to 17, or nothing', () => {
  const ages = [2, '3', 2.7, -1, 30, 'dos', null].map(
    (age) => readUnderstanding(answer({ kids: [{ name: 'Milán', age }] }), TEXT)?.family.kids[0].age,
  )
  assert.deepEqual(ages, [2, 3, 2, null, null, null, null])
})

test('a fenced answer is read, and an answer with no JSON is not', () => {
  assert.equal(readUnderstanding('```json\n' + answer() + '\n```', TEXT)?.family.kids[0].name, 'Milán')
  assert.equal(readUnderstanding('No encontré ninguna familia.', TEXT), null)
})
