import assert from 'node:assert/strict'
import { test } from 'node:test'
import { systemPrompt } from '../../src/stories/prompts/compose.js'
import { anchorOf, clampMinutes, familyLines, moodAt, parseOption, wordsIn } from '../../src/stories/storytelling.js'

/** @param {{ name: string, age: number | null }[]} kids */
const profileOf = (kids) => ({
  id: 'fam',
  name: null,
  kids: kids.map((kid, index) => ({ id: `k${index}`, playing: true, ...kid })),
  pets: [{ id: 'p', name: 'Inca' }],
  interests: ['los dinosaurios'],
  toys: [{ id: 't', name: 'el tren grandote' }],
})

test('the youngest kid with an age anchors the story, and its band comes with it', () => {
  const cases = [
    [[{ name: 'Bebé', age: 1 }], '1', [2, 2], [150, 220]],
    [[{ name: 'Milán', age: 2 }], '2', [3, 4], [300, 450]],
    [[{ name: 'Nina', age: 3 }], '3', [4, 5], [450, 600]],
    [[{ name: 'Sofi', age: 4 }], '4', [5, 6], [600, 750]],
    [[{ name: 'Lu', age: 5 }], '5', [6, 7], [750, 900]],
    [[{ name: 'Tomi', age: 9 }], '5', [6, 7], [750, 900]],
  ]
  for (const [kids, id, minutes, words] of cases) {
    const { band, anchor } = anchorOf(profileOf(/** @type {any} */ (kids)))
    assert.equal(band.id, id)
    assert.deepEqual(band.minutes, minutes)
    assert.deepEqual(band.words, words)
    assert.equal(anchor?.name, kids[0].name)
  }
})

test('kids with no age do not anchor, and a family with no ages at all gets band 3', () => {
  const mixed = anchorOf(profileOf([{ name: 'Sin edad', age: null }, { name: 'Sofi', age: 4 }]))
  assert.equal(mixed.anchor?.name, 'Sofi')
  assert.equal(mixed.band.id, '4')

  const none = anchorOf(profileOf([{ name: 'Sin edad', age: null }]))
  assert.equal(none.anchorAge, 3)
  assert.equal(none.band.id, '3')
})

test('the system prompt is the core plus one band and one moment', () => {
  const prompt = systemPrompt({ band: '3', mood: 'calm' })
  assert.match(prompt, /Sos el narrador de cuentos de Juguemos/)
  assert.match(prompt, /## La familia/)
  assert.match(prompt, /## Lo que nunca pasa/)
  assert.match(prompt, /## Cómo se escribe para este chico: TRES AÑOS/)
  assert.match(prompt, /## El momento: TRANQUI, antes de dormir/)
  assert.doesNotMatch(prompt, /UN AÑO|DOS AÑOS|CUATRO AÑOS|CINCO AÑOS/)
  assert.doesNotMatch(prompt, /CON PILAS/)
  assert.equal(prompt.match(/## Cómo se escribe/g).length, 1)
})

test('a band or a moment with no fragment is a bug, not a quiet story', () => {
  assert.throws(() => systemPrompt({ band: '9', mood: 'calm' }), /No prompt fragment for the band 9/)
  assert.throws(() => systemPrompt({ band: '1', mood: /** @type {any} */ ('fiesta') }), /No prompt fragment for the moment fiesta/)
})

test('the family lines name only what the casting holds', () => {
  const profile = profileOf([{ name: 'Milán', age: 2 }, { name: 'Sofi', age: 4 }])
  const lines = familyLines(profile, /** @type {any} */ ({ kids: ['k1'], pet: null, toy: { id: 't', name: 'el tren grandote' }, theme: null }))
  assert.equal(lines.kids, 'Sofi, de 4 años')
  assert.equal(lines.pet, 'no aparece en este cuento')
  assert.equal(lines.toys, 'el tren grandote')
  assert.equal(lines.interests, 'sin tema fijo')
})

test('one option is read from a bare object, an array, or a tramas wrapper, fences and all', () => {
  const band = anchorOf(profileOf([{ name: 'Milán', age: 2 }])).band
  const plot = { title: 'Milán y el tren.', teaser: 'Un paseo.', minutes: 4, premise: 'Salen. Vuelven.' }
  for (const answer of [
    JSON.stringify(plot),
    JSON.stringify([plot]),
    JSON.stringify({ tramas: [plot] }),
    '```json\n' + JSON.stringify(plot) + '\n```',
  ]) {
    assert.deepEqual(parseOption(answer, band), plot)
  }
  assert.throws(() => parseOption('no hay json acá', band), /no readable option/)
  assert.throws(() => parseOption(JSON.stringify({ title: 'Sin premisa', teaser: 'Nada.' }), band), /no readable option/)
})

test('the minutes stay inside the band, and an answer without them gets its shortest story', () => {
  const band = { id: '2', maxAge: 2, minutes: /** @type {[number, number]} */ ([3, 4]), words: /** @type {[number, number]} */ ([300, 450]) }
  assert.equal(clampMinutes(9, band), 4)
  assert.equal(clampMinutes(1, band), 3)
  assert.equal(clampMinutes('cuatro', band), 3)
  assert.equal(clampMinutes(undefined, band), 3)
  assert.equal(clampMinutes(3.4, band), 3)
})

test('the word count is every paragraph of every part', () => {
  assert.equal(wordsIn([['Milán se despertó.', 'Inca movió la cola.'], ['Fin.']]), 8)
  assert.equal(wordsIn([]), 0)
})

test('the moment follows the Buenos Aires clock', () => {
  assert.equal(moodAt(new Date('2026-09-14T21:00:00-03:00')), 'calm')
  assert.equal(moodAt(new Date('2026-09-14T20:00:00Z')), 'lively')
})
