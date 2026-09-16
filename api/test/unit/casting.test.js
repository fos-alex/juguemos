import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seededRandom } from '../../src/catalog/slots.js'
import { castingLines, castScreen, DEFAULT_WEIGHTS } from '../../src/stories/casting.js'

/** The example family: Milán anchors it, since he is the youngest with an age. */
const PROFILE = {
  id: 'fam',
  name: null,
  kids: [
    { id: 'k-milan', name: 'Milán', ageMonths: 26, playing: true },
    { id: 'k-sofi', name: 'Sofi', ageMonths: 52, playing: true },
  ],
  pets: [{ id: 'p-inca', name: 'Inca' }],
  interests: ['los dinosaurios', 'los caballos', 'la plaza'],
  toys: [
    { id: 't-dino', name: 'el dinosaurio chiquito' },
    { id: 't-tren', name: 'el tren grandote' },
    { id: 't-osito', name: 'el osito marrón' },
    { id: 't-caballo', name: 'el caballo percherón' },
  ],
}

/** @param {object} [overrides] */
const weights = (overrides = {}) => ({ ...DEFAULT_WEIGHTS, ...overrides })

/** @param {string} seed @param {object} [options] */
const screen = (seed, options = {}) => castScreen(PROFILE, { count: 3, random: seededRandom(seed), ...options })

test('a screen of castings keeps the shape the prompt and the audit read', () => {
  for (const casting of screen('reparto')) {
    assert.ok(['cast', 'wildcard'].includes(casting.kind))
    assert.ok(['kid', 'pet', 'toy', 'new'].includes(casting.lead.type))
    assert.ok(casting.lead.name)
    assert.deepEqual(casting.weights, DEFAULT_WEIGHTS)
    assert.equal(typeof casting.draws.anchorIn, 'number')
    assert.equal(typeof casting.draws.wildcard, 'number')
    for (const id of casting.kids) assert.ok(PROFILE.kids.some((kid) => kid.id === id))
    if (casting.toy) assert.ok(PROFILE.toys.some((toy) => toy.id === casting.toy.id))
    if (casting.theme) assert.ok(PROFILE.interests.includes(casting.theme))
    // The lead is one of the people the casting says are in the story.
    if (casting.lead.type === 'kid') assert.ok(casting.kids.includes(casting.lead.id))
    if (casting.lead.type === 'pet') assert.equal(casting.lead.id, casting.pet?.id)
    if (casting.lead.type === 'toy') assert.equal(casting.lead.id, casting.toy?.id)
  }
})

test('the anchor is out of the kids when its draw says so', () => {
  for (const seed of ['uno', 'dos', 'tres', 'cuatro', 'cinco']) {
    for (const casting of screen(seed)) {
      assert.equal(casting.kids.includes('k-milan'), casting.anchorIn)
      assert.ok(casting.kids.includes('k-sofi'), 'the other kid is always in')
    }
  }
})

test('the toys and the themes of a screen are drawn without replacement', () => {
  for (const seed of ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis']) {
    const castings = screen(seed, { weights: weights({ wildcard: 0 }) })
    const toys = castings.map((casting) => casting.toy?.id).filter(Boolean)
    const themes = castings.map((casting) => casting.theme).filter(Boolean)
    assert.equal(new Set(toys).size, toys.length, `toys repeat on the screen drawn from ${seed}`)
    assert.equal(new Set(themes).size, themes.length, `themes repeat on the screen drawn from ${seed}`)
  }
})

test('the three castings of a screen lead with different people, when the family has enough', () => {
  const random = seededRandom('protagonistas')
  let allDifferent = 0
  for (let round = 0; round < 100; round += 1) {
    const castings = castScreen(PROFILE, { count: 3, random, weights: weights({ wildcard: 0 }) })
    const leads = castings.map((casting) => `${casting.lead.type}:${casting.lead.id}`)
    if (new Set(leads).size === 3) allDifferent += 1
  }
  // Two kids, a pet and a toy can lead, so three different leads is the norm;
  // a screen where the pet and the toys all stayed out has fewer to choose from.
  assert.ok(allDifferent > 60, `only ${allDifferent} screens in 100 had three different leads`)
})

test('weights of 1 put the whole family in, and the anchor leads the first option', () => {
  const castings = screen('todo', { weights: weights({ anchorIn: 1, anchorLead: 1, petIn: 1, toyIn: 1, themeIn: 1, wildcard: 0 }) })
  for (const casting of castings) {
    assert.equal(casting.kind, 'cast')
    assert.equal(casting.anchorIn, true)
    assert.deepEqual(casting.kids, ['k-milan', 'k-sofi'])
    assert.equal(casting.pet?.name, 'Inca')
    assert.ok(casting.toy)
    assert.ok(casting.theme)
  }
  // Even at a weight of 1 the anchor leads once a screen: the other two
  // options go to somebody else, so the three are not the same story.
  assert.deepEqual(castings[0].lead, { type: 'kid', id: 'k-milan', name: 'Milán' })
  assert.ok(castings.slice(1).every((casting) => casting.lead.id !== 'k-milan'))
})

test('weights of 0 leave the anchor, the pet, the toys and the theme out', () => {
  const castings = screen('nada', { weights: weights({ anchorIn: 0, anchorLead: 0, petIn: 0, toyIn: 0, themeIn: 0, wildcard: 0 }) })
  for (const casting of castings) {
    assert.equal(casting.anchorIn, false)
    assert.deepEqual(casting.kids, ['k-sofi'])
    assert.equal(casting.pet, null)
    assert.equal(casting.toy, null)
    assert.equal(casting.theme, null)
    // Only the other kid is left to lead.
    assert.deepEqual(casting.lead, { type: 'kid', id: 'k-sofi', name: 'Sofi' })
    assert.equal(casting.draws.anchorLead, null, 'a decision the profile never offered has no draw')
  }
})

test('with nobody else to lead, the anchor leads, and without the anchor a new character does', () => {
  const alone = { ...PROFILE, kids: [PROFILE.kids[0]], pets: [], toys: [], interests: [] }
  const [leads] = castScreen(alone, { count: 1, random: seededRandom('solo'), weights: weights({ anchorIn: 1, anchorLead: 0, wildcard: 0 }) })
  assert.deepEqual(leads.lead, { type: 'kid', id: 'k-milan', name: 'Milán' })

  const [nobody] = castScreen(alone, { count: 1, random: seededRandom('solo'), weights: weights({ anchorIn: 0, wildcard: 0 }) })
  assert.deepEqual(nobody.lead, { type: 'new', id: null, name: 'un personaje nuevo' })
  assert.deepEqual(nobody.kids, [])
})

test('a toy used in the family last stories comes up less often', () => {
  const recent = [{ toy: { id: 't-dino' }, theme: 'los dinosaurios' }]
  const only = weights({ toyIn: 1, themeIn: 1, wildcard: 0 })
  const counts = { 't-dino': 0, other: 0 }
  const random = seededRandom('penalidad')
  for (let round = 0; round < 400; round += 1) {
    const [casting] = castScreen(PROFILE, { count: 1, weights: only, random, recent })
    counts[casting.toy.id === 't-dino' ? 't-dino' : 'other'] += 1
  }
  // One of four toys weighs 0.3 against three of 1: about one draw in eleven.
  assert.ok(counts['t-dino'] / 400 < 0.16, `the toy used lately came up ${counts['t-dino']} times in 400`)
  assert.ok(counts['t-dino'] > 0, 'it is less likely, not impossible')
})

test('the wildcard drops the family props and keeps the kids', () => {
  const castings = screen('comodin', { weights: weights({ wildcard: 1 }) })
  const wild = castings.filter((casting) => casting.kind === 'wildcard')
  assert.equal(wild.length, 1, 'one option a screen, at most')
  assert.equal(wild[0].pet, null)
  assert.equal(wild[0].toy, null)
  assert.equal(wild[0].theme, null)
  assert.ok(['kid', 'new'].includes(wild[0].lead.type), 'a pet or a toy that is out cannot lead')
  assert.equal(wild[0].draws.wildcard, castings[0].draws.wildcard, 'one draw for the whole screen')
})

test('no wildcard when its draw misses', () => {
  for (const seed of ['uno', 'dos', 'tres']) {
    const castings = screen(seed, { weights: weights({ wildcard: 0 }) })
    assert.ok(castings.every((casting) => casting.kind === 'cast'))
  }
})

test('the same seed draws the same screen', () => {
  assert.deepEqual(screen('igual'), screen('igual'))
})

test('the casting reaches the prompt as plain lines, with the names as the family typed them', () => {
  const base = {
    kind: 'cast',
    anchorIn: true,
    kids: ['k-milan', 'k-sofi'],
    draws: { anchorIn: 0, anchorLead: 0, petIn: 0, toyIn: 0, themeIn: 0, wildcard: 0 },
    weights: DEFAULT_WEIGHTS,
  }
  const full = castingLines(
    {
      ...base,
      kids: ['k-milan'],
      lead: { type: 'kid', id: 'k-milan', name: 'Milán' },
      pet: { id: 'p-inca', name: 'Inca' },
      toy: { id: 't-tren', name: 'el tren grandote' },
      theme: 'los dinosaurios',
    },
    PROFILE,
  )
  assert.equal(full, 'Protagonista: Milán. También aparecen: Inca, el tren grandote. Tema: los dinosaurios.')

  const bare = castingLines(
    { ...base, kids: ['k-milan'], lead: { type: 'toy', id: 't-tren', name: 'el tren grandote' }, pet: null, toy: { id: 't-tren', name: 'el tren grandote' }, theme: null },
    PROFILE,
  )
  assert.equal(bare, 'Protagonista: el tren grandote. También aparecen: Milán. Sin mascota, sin tema fijo.')

  const wild = castingLines(
    { ...base, kind: 'wildcard', kids: ['k-milan'], lead: { type: 'kid', id: 'k-milan', name: 'Milán' }, pet: null, toy: null, theme: null },
    PROFILE,
  )
  assert.match(wild, /^Reparto libre: inventá el escenario o un personaje secundario nuevo que la familia no mencionó\./)
  assert.match(wild, /Protagonista: Milán\. Sin mascota, sin juguetes, sin tema de la familia\.$/)
})
