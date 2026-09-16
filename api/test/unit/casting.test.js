import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seededRandom } from '../../src/catalog/slots.js'
import { castingLines, castKeyword, castScreen, DEFAULT_WEIGHTS } from '../../src/stories/casting.js'

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
const screen = (seed, options = {}) => castScreen(PROFILE, { random: seededRandom(seed), ...options })

test('a screen is two castings that keep the shape the prompt and the audit read', () => {
  for (const seed of ['reparto', 'uno', 'dos', 'tres']) {
    const castings = screen(seed)
    assert.equal(castings.length, 2)
    for (const casting of castings) {
      assert.ok(['kid', 'pet', 'toy', 'new'].includes(casting.lead.type))
      assert.ok(casting.lead.name)
      assert.deepEqual(casting.weights, DEFAULT_WEIGHTS)
      assert.equal(typeof casting.draws.petIn, 'number')
      assert.equal(typeof casting.draws.toyIn, 'number')
      // Every kid playing is in both.
      assert.deepEqual(casting.kids, ['k-milan', 'k-sofi'])
      if (casting.toy) assert.ok(PROFILE.toys.some((toy) => toy.id === casting.toy.id))
      if (casting.theme) assert.ok(PROFILE.interests.includes(casting.theme))
      if (casting.lead.type === 'pet') assert.equal(casting.lead.id, casting.pet?.id)
      if (casting.lead.type === 'toy') assert.equal(casting.lead.id, casting.toy?.id)
    }
  }
})

test('the first option is the classic: the anchor kid leads it', () => {
  for (const seed of ['uno', 'dos', 'tres', 'cuatro', 'cinco']) {
    const [classic] = screen(seed)
    assert.equal(classic.kind, 'cast')
    assert.equal(classic.anchorIn, true)
    assert.deepEqual(classic.lead, { type: 'kid', id: 'k-milan', name: 'Milán' })
    assert.equal(classic.draws.lead, null, 'nothing is drawn for its lead')
  }
})

test('the second option is new: someone else leads it, and it has no family theme', () => {
  const leads = new Set()
  for (const seed of ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho']) {
    const [, fresh] = screen(seed)
    assert.equal(fresh.kind, 'wildcard')
    assert.equal(fresh.theme, null)
    assert.equal(fresh.draws.themeIn, null)
    assert.notEqual(fresh.lead.id, 'k-milan')
    leads.add(fresh.lead.type)
  }
  assert.ok(leads.has('kid'), 'the other kid leads some of them')
})

test('the two options never share a toy while the family has more than one', () => {
  for (const seed of ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis']) {
    const [classic, fresh] = screen(seed, { weights: weights({ toyIn: 1 }) })
    assert.ok(classic.toy && fresh.toy)
    assert.notEqual(classic.toy.id, fresh.toy.id, `the screen drawn from ${seed} repeats a toy`)
  }
})

test('weights of 1 put the pet, a toy and a theme in', () => {
  const [classic, fresh] = screen('todo', { weights: weights({ petIn: 1, toyIn: 1, themeIn: 1 }) })
  for (const casting of [classic, fresh]) {
    assert.equal(casting.pet?.name, 'Inca')
    assert.ok(casting.toy)
  }
  assert.ok(classic.theme)
})

test('weights of 0 leave the pet, the toys and the theme out', () => {
  const [classic, fresh] = screen('nada', { weights: weights({ petIn: 0, toyIn: 0, themeIn: 0 }) })
  for (const casting of [classic, fresh]) {
    assert.equal(casting.pet, null)
    assert.equal(casting.toy, null)
    assert.equal(casting.theme, null)
  }
  // Only the other kid is left to lead the new one.
  assert.deepEqual(fresh.lead, { type: 'kid', id: 'k-sofi', name: 'Sofi' })
})

test('with nobody else in the family, the anchor leads both, and with no kids a new character does', () => {
  const alone = { ...PROFILE, kids: [PROFILE.kids[0]], pets: [], toys: [], interests: [] }
  const [classic, fresh] = castScreen(alone, { random: seededRandom('solo') })
  assert.deepEqual(classic.lead, { type: 'kid', id: 'k-milan', name: 'Milán' })
  assert.deepEqual(fresh.lead, { type: 'kid', id: 'k-milan', name: 'Milán' })
  assert.equal(classic.draws.petIn, null, 'a decision the profile never offered has no draw')

  const nobody = castScreen({ ...alone, kids: [] }, { random: seededRandom('solo') })
  for (const casting of nobody) assert.deepEqual(casting.lead, { type: 'new', id: null, name: 'un personaje nuevo' })
})

test('a toy used in the family last stories comes up less often', () => {
  const recent = [{ toy: { id: 't-dino' }, theme: 'los dinosaurios' }]
  const only = weights({ toyIn: 1, themeIn: 1 })
  const counts = { 't-dino': 0, other: 0 }
  const random = seededRandom('penalidad')
  for (let round = 0; round < 400; round += 1) {
    const [casting] = castScreen(PROFILE, { weights: only, random, recent })
    counts[casting.toy.id === 't-dino' ? 't-dino' : 'other'] += 1
  }
  // One of four toys weighs 0.3 against three of 1: about one draw in eleven.
  assert.ok(counts['t-dino'] / 400 < 0.16, `the toy used lately came up ${counts['t-dino']} times in 400`)
  assert.ok(counts['t-dino'] > 0, 'it is less likely, not impossible')
})

test('a keyword casting is the classic, with the keyword as its theme', () => {
  const casting = castKeyword(PROFILE, { keyword: 'los caballos', random: seededRandom('tema') })
  assert.equal(casting.kind, 'keyword')
  assert.equal(casting.theme, 'los caballos')
  assert.deepEqual(casting.lead, { type: 'kid', id: 'k-milan', name: 'Milán' })
  assert.equal(casting.draws.themeIn, null)
})

test('the same seed draws the same screen', () => {
  assert.deepEqual(screen('igual'), screen('igual'))
})

test('the casting reaches the prompt as plain lines, with the names as the family typed them', () => {
  const base = {
    kind: 'cast',
    anchorIn: true,
    kids: ['k-milan', 'k-sofi'],
    draws: { petIn: 0, toyIn: 0, themeIn: 0, lead: null },
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
  assert.match(wild, /^Propuesta nueva: inventá un lugar, un personaje secundario o una situación que la familia todavía no escuchó\./)
  assert.match(wild, /Protagonista: Milán\. Sin mascota, sin juguetes, sin tema de la familia\.$/)
})
