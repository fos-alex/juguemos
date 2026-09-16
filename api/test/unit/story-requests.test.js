import assert from 'node:assert/strict'
import { test } from 'node:test'
import { castingLines, castRequest } from '../../src/stories/casting.js'
import { isEmpty, requestFor, requestLines } from '../../src/stories/requests.js'

/** Milán is the youngest, so he anchors a story that names no kid. */
const PROFILE = {
  id: 'fam',
  name: null,
  kids: [
    { id: 'k-milan', name: 'Milán', ageMonths: 26, interests: ['los dinosaurios'] },
    { id: 'k-sofi', name: 'Sofi', ageMonths: 52, interests: ['los planetas'] },
  ],
  pets: [{ id: 'p-inca', name: 'Inca' }],
  interests: ['los dinosaurios', 'los planetas'],
  toys: [
    { id: 't-tren', name: 'el tren grandote' },
    { id: 't-osito', name: 'el osito marrón' },
  ],
}

/** @param {object} [overrides] */
const request = (overrides = {}) =>
  requestFor(
    {
      summary: 'Milán y un dragón miedoso buscan la luna.',
      family: ['Milán'],
      characters: ['un dragón que le tiene miedo a la oscuridad'],
      setting: 'la plaza de noche',
      theme: 'la valentía',
      plot: 'El dragón no se anima a salir y Milán lo acompaña.',
      ...overrides,
    },
    PROFILE,
  )

test('family names come back as the family spells them, whatever the transcript made of them', () => {
  const read = request({ family: ['milan', 'tren grandote', 'INCA'] })
  assert.deepEqual(read.family, ['Milán', 'el tren grandote', 'Inca'])
})

test('a name that is not the family’s is a character, and a family name among the characters is family', () => {
  const read = request({ family: ['la abuela Rosa'], characters: ['el osito marrón', 'un dragón'] })
  assert.deepEqual(read.family, ['el osito marrón'])
  assert.deepEqual(read.characters, ['la abuela Rosa', 'un dragón'])
})

test('texts are trimmed, cut to their limits, and each said once', () => {
  const read = request({
    summary: `  ${'a'.repeat(300)}  `,
    family: ['Milán', 'milán'],
    characters: ['un dragón', 'Un dragón', '', 7],
    setting: '   ',
    plot: 'b'.repeat(900),
  })
  assert.equal(read.summary.length, 200)
  assert.deepEqual(read.family, ['Milán'])
  assert.deepEqual(read.characters, ['un dragón'])
  assert.equal(read.setting, null)
  assert.equal(read.plot?.length, 500)
})

test('a request with no summary gets one from who is in it, or from what it is about', () => {
  assert.equal(request({ summary: '' }).summary, 'Un cuento con Milán, un dragón que le tiene miedo a la oscuridad.')
  assert.equal(
    requestFor({ summary: null, family: [], characters: [], theme: 'los planetas' }, PROFILE).summary,
    'Un cuento sobre los planetas.',
  )
})

test('words that ask for no story read as an empty request', () => {
  const read = requestFor({ summary: 'Hola.', family: [], characters: [], setting: null, theme: null, plot: null }, PROFILE)
  assert.ok(isEmpty(read))
  assert.equal(read.summary, '')
  assert.ok(isEmpty(requestFor(null, PROFILE)))
})

test('the request reaches the story call as one line for each thing it says', () => {
  const lines = requestLines(request({ setting: null }))
  assert.equal(
    lines,
    [
      'Lo que pidieron: Milán y un dragón miedoso buscan la luna.',
      'De la familia: Milán',
      'Otros personajes: un dragón que le tiene miedo a la oscuridad',
      'Tema: la valentía',
      'Qué pasa: El dragón no se anima a salir y Milán lo acompaña.',
    ].join('\n'),
  )
})

test('the casting follows the request: whoever it names first leads, with the pet and toy it names', () => {
  const casting = castRequest(PROFILE, request({ family: ['Inca', 'el osito marrón'] }))
  assert.equal(casting.kind, 'request')
  assert.deepEqual(casting.lead, { type: 'pet', id: 'p-inca', name: 'Inca' })
  assert.deepEqual(casting.pet, { id: 'p-inca', name: 'Inca' })
  assert.deepEqual(casting.toy, { id: 't-osito', name: 'el osito marrón' })
  // It names no kid, so every kid in the profile is in it.
  assert.deepEqual(casting.kids, ['k-milan', 'k-sofi'])
  assert.equal(casting.theme, 'la valentía')
  assert.equal(casting.draws.petIn, null, 'nothing is drawn')
})

test('a request that names only its own characters is led by the first of them, with the kids along', () => {
  const casting = castRequest(PROFILE, request({ family: [] }))
  assert.deepEqual(casting.lead, { type: 'new', id: null, name: 'un dragón que le tiene miedo a la oscuridad' })
  assert.equal(
    castingLines(casting, PROFILE),
    'Protagonista: un dragón que le tiene miedo a la oscuridad. También aparecen: Milán, Sofi. Tema: la valentía. Sin mascota, sin juguetes.',
  )
})

test('a request with nobody in it is led by the youngest kid', () => {
  const casting = castRequest(PROFILE, request({ family: [], characters: [] }))
  assert.deepEqual(casting.lead, { type: 'kid', id: 'k-milan', name: 'Milán' })
})
