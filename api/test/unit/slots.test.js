import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fillFor, fitsAge, render, seededRandom, unknownPlaceholders } from '../../src/catalog/slots.js'

const fill = { kid: 'Milán', pet: 'Inca', toy: 'el osito marrón', toy2: 'la pelota', interest: 'los dinosaurios' }

/** @param {Partial<import('../../src/families/families.service.js').Profile>} [overrides] */
const profile = (overrides) => ({
  id: 'family',
  name: null,
  kids: [{ id: 'k1', name: 'Milán', age: 2, playing: true, interests: ['los dinosaurios'] }],
  pets: [{ id: 'p1', name: 'Inca' }],
  interests: ['los dinosaurios'],
  toys: [
    { id: 't1', name: 'el osito marrón' },
    { id: 't2', name: 'la pelota' },
  ],
  ...overrides,
})

test('slots take the family words as typed, contracting "de el" and "a el"', () => {
  assert.equal(render('La búsqueda de {toy}', fill), 'La búsqueda del osito marrón')
  assert.equal(render('Subí a {toy} y a {toy2} al tren.', fill), 'Subí al osito marrón y a la pelota al tren.')
  assert.equal(render('Para {kid}, que ama {interest}.', fill), 'Para Milán, que ama los dinosaurios.')
})

test('a value that opens a sentence gets a capital, and nothing else changes', () => {
  assert.equal(render('{toy} tiene hambre', fill), 'El osito marrón tiene hambre')
  assert.equal(render('Nada. {toy} apareció.', fill), 'Nada. El osito marrón apareció.')
  assert.equal(render('—{pet}, ¿venís?', fill), '—Inca, ¿venís?')
  assert.equal(render('¡{toy2} rueda!', fill), '¡La pelota rueda!')
  assert.equal(render('Traé {toy}.', fill), 'Traé el osito marrón.')
})

test('keepStart leaves the first letter to the layout', () => {
  assert.equal(render('{toy} y un almohadón.', fill, { keepStart: true }), 'el osito marrón y un almohadón.')
})

test('placeholders that are not slots are reported', () => {
  assert.deepEqual(unknownPlaceholders(['{kid} y {perro}', 'con {toy}']), ['perro'])
})

test('ages overlap by years, and an unknown age fits anything', () => {
  const toddlers = { minAgeMonths: 12, maxAgeMonths: 36 }
  assert.equal(fitsAge({ age: 3 }, toddlers), true)
  assert.equal(fitsAge({ age: 4 }, toddlers), false)
  // Under one is 0 to 11 months: too young for a range that starts at 12.
  assert.equal(fitsAge({ age: 0 }, toddlers), false)
  assert.equal(fitsAge({ age: null }, toddlers), true)
})

test('a template is filled only when the family has what it needs', () => {
  const template = (texts) => ({ texts, minAgeMonths: 12, maxAgeMonths: 47 })
  const random = seededRandom('x')

  assert.equal(fillFor(profile(), template(['{kid} y {pet}']), random)?.pet, 'Inca')
  assert.equal(fillFor(profile({ pets: [] }), template(['{kid} y {pet}']), random), null)
  assert.equal(fillFor(profile(), template(['{toy}, {toy2} y {toy3}']), random), null)
  const noInterests = [{ id: 'k1', name: 'Milán', age: 2, playing: true, interests: [] }]
  assert.equal(fillFor(profile({ kids: noInterests, interests: [] }), template(['{interest}']), random), null)
  const tooOld = [{ id: 'k', name: 'Sofi', age: 6, playing: true, interests: [] }]
  assert.equal(fillFor(profile({ kids: tooOld }), template(['{kid}']), random), null)

  const toys = fillFor(profile(), template(['{toy} y {toy2}']), random)
  assert.notEqual(toys?.toy, toys?.toy2)
})

test('everyKid needs the whole family in the age range', () => {
  const kids = [
    { id: 'k1', name: 'Milán', age: 1, playing: true, interests: [] },
    { id: 'k2', name: 'Sofi', age: 4, playing: true, interests: [] },
  ]
  const toddlers = { texts: ['{kid}'], minAgeMonths: 12, maxAgeMonths: 47 }
  assert.equal(fillFor(profile({ kids }), toddlers, Math.random)?.kid, 'Milán')
  assert.equal(fillFor(profile({ kids }), toddlers, Math.random, { everyKid: true }), null)
  const wide = { ...toddlers, maxAgeMonths: 71 }
  assert.equal(fillFor(profile({ kids }), wide, Math.random, { everyKid: true })?.kid, 'Milán')
})

test('the kid in the slot is the first one in the age range', () => {
  const kids = [
    { id: 'k1', name: 'Sofi', age: 6, playing: true, interests: [] },
    { id: 'k2', name: 'Milán', age: 2, playing: true, interests: [] },
  ]
  const filled = fillFor(profile({ kids }), { texts: ['{kid}'], minAgeMonths: 12, maxAgeMonths: 47 }, Math.random)
  assert.equal(filled?.kid, 'Milán')
})

test('{interest} is something the kid in {kid} loves, so that kid has to love something', () => {
  const kids = [
    { id: 'k1', name: 'Milán', age: 2, playing: true, interests: [] },
    { id: 'k2', name: 'Sofi', age: 3, playing: true, interests: ['dibujar'] },
  ]
  const texts = ['Cosas que le encantan a {kid}, como {interest}.']
  const filled = fillFor(profile({ kids }), { texts, minAgeMonths: 12, maxAgeMonths: 47 }, seededRandom('x'))
  assert.equal(filled?.kid, 'Sofi')
  assert.equal(filled?.interest, 'dibujar')
  // A template without {interest} still names the first kid in range.
  assert.equal(fillFor(profile({ kids }), { texts: ['{kid}'], minAgeMonths: 12, maxAgeMonths: 47 }, Math.random)?.kid, 'Milán')
})

test('a seeded random repeats itself, and stays in [0, 1)', () => {
  const first = seededRandom('family:template')
  const second = seededRandom('family:template')
  const values = Array.from({ length: 20 }, () => first())
  assert.deepEqual(values, Array.from({ length: 20 }, () => second()))
  assert.ok(values.every((value) => value >= 0 && value < 1))
  assert.notDeepEqual(values, Array.from({ length: 20 }, seededRandom('another')))
})
