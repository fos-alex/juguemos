import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ANY, matching, playsSound } from '../../src/activities/choices.js'

/** @param {{ slug: string, place?: 'indoor' | 'outdoor', categories?: string[], game?: object | null }} overrides */
const candidate = ({ slug, place = 'indoor', categories = ['pretend'], game = null }) => ({
  template: /** @type {import('../../src/catalog/catalog.service.js').FillableActivityTemplate} */ (
    /** @type {unknown} */ ({ slug, place, categories, game })
  ),
  fill: {},
})

const slugs = (/** @type {{ template: { slug: string } }[]} */ list) => list.map((each) => each.template.slug)

const CANDIDATES = [
  candidate({ slug: 'escondidas', categories: ['pretend', 'move'] }),
  candidate({ slug: 'plaza', place: 'outdoor', categories: ['move', 'out_and_about'] }),
  candidate({ slug: 'dibujo', categories: ['create'] }),
  candidate({ slug: 'que-suena', categories: ['learn', 'low_energy'], game: { type: 'sounds', set: 'granja' } }),
]

test('no choice keeps every juego that fits', () => {
  const { chosen, closest } = matching(CANDIDATES, ANY)
  assert.deepEqual(slugs(chosen), ['escondidas', 'plaza', 'dibujo', 'que-suena'])
  assert.equal(closest, false)
})

test('each choice keeps only the juegos that match it', () => {
  assert.deepEqual(slugs(matching(CANDIDATES, { ...ANY, place: 'outdoor' }).chosen), ['plaza'])
  assert.deepEqual(slugs(matching(CANDIDATES, { ...ANY, place: 'indoor' }).chosen), ['escondidas', 'dibujo', 'que-suena'])
  assert.deepEqual(slugs(matching(CANDIDATES, { ...ANY, sound: true }).chosen), ['que-suena'])
  assert.deepEqual(slugs(matching(CANDIDATES, { ...ANY, sound: false }).chosen), ['escondidas', 'plaza', 'dibujo'])
  assert.deepEqual(slugs(matching(CANDIDATES, { ...ANY, category: 'move' }).chosen), ['escondidas', 'plaza'])
})

test('choices together keep the juegos that match all of them', () => {
  const { chosen, closest } = matching(CANDIDATES, { place: 'indoor', sound: false, category: 'move' })
  assert.deepEqual(slugs(chosen), ['escondidas'])
  assert.equal(closest, false)
})

test('when none matches all of them, the ones that match the most are the closest', () => {
  // Nothing outside plays sound: the plaza matches the place, ¿Qué suena? the sound.
  const both = matching(CANDIDATES, { ...ANY, place: 'outdoor', sound: true })
  assert.deepEqual(slugs(both.chosen), ['plaza', 'que-suena'])
  assert.equal(both.closest, true)

  // Two of three beats one of three.
  const most = matching(CANDIDATES, { place: 'outdoor', sound: false, category: 'create' })
  assert.deepEqual(slugs(most.chosen), ['plaza', 'dibujo'])
  assert.equal(most.closest, true)
})

test('a juego plays sound when it is ¿Qué suena?', () => {
  assert.equal(playsSound(CANDIDATES[3].template), true)
  assert.equal(playsSound(CANDIDATES[0].template), false)
})
