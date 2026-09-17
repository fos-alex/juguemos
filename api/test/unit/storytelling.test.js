import assert from 'node:assert/strict'
import { test } from 'node:test'
import { systemPrompt } from '../../src/stories/prompts/compose.js'
import {
  ageLine,
  anchorOf,
  charactersIn,
  clampMinutes,
  episodeLines,
  familyLines,
  mergeCharacters,
  moodAt,
  OptionsParser,
  seriesLines,
  StoryParser,
  toPlot,
  wordsIn,
} from '../../src/stories/storytelling.js'

/** @param {{ name: string, ageMonths: number | null }[]} kids */
const profileOf = (kids) => ({
  id: 'fam',
  name: null,
  home: null,
  parents: [],
  kids: kids.map((kid, index) => ({ id: `k${index}`, playing: true, ...kid })),
  pets: [{ id: 'p', name: 'Inca', kind: 'perro' }],
  interests: ['los dinosaurios'],
  toys: [{ id: 't', name: 'el tren grandote' }],
})

test('the youngest kid with an age anchors the story, and its band comes with it', () => {
  // Six months a band under four years, a year a band at four and five (JUG-145).
  const cases = [
    [[{ name: 'Bebé', ageMonths: 8 }], '1', [2, 3], [200, 300]],
    [[{ name: 'Milán', ageMonths: 12 }], '1', [2, 3], [200, 300]],
    [[{ name: 'Milán', ageMonths: 22 }], '1.5', [3, 3], [280, 380]],
    [[{ name: 'Milán', ageMonths: 26 }], '2', [3, 4], [350, 480]],
    [[{ name: 'Nina', ageMonths: 30 }], '2.5', [4, 5], [450, 600]],
    [[{ name: 'Nina', ageMonths: 36 }], '3', [4, 5], [520, 680]],
    [[{ name: 'Nina', ageMonths: 47 }], '3.5', [5, 6], [620, 780]],
    [[{ name: 'Sofi', ageMonths: 52 }], '4', [5, 6], [700, 850]],
    [[{ name: 'Lu', ageMonths: 60 }], '5', [6, 7], [800, 1000]],
    [[{ name: 'Tomi', ageMonths: 110 }], '5', [6, 7], [800, 1000]],
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
  const mixed = anchorOf(profileOf([{ name: 'Sin edad', ageMonths: null }, { name: 'Sofi', ageMonths: 52 }]))
  assert.equal(mixed.anchor?.name, 'Sofi')
  assert.equal(mixed.band.id, '4')

  const none = anchorOf(profileOf([{ name: 'Sin edad', ageMonths: null }]))
  assert.equal(none.anchorMonths, 36)
  assert.equal(none.band.id, '3')
})

test('the system prompt is the core plus one band and one moment', () => {
  const prompt = systemPrompt({ band: '3', mood: 'calm' })
  assert.match(prompt, /Sos el narrador de cuentos de Ludi/)
  assert.match(prompt, /## La familia/)
  assert.match(prompt, /## Lo que nunca pasa/)
  assert.match(prompt, /## Cómo se escribe para este chico: DE TRES A TRES AÑOS Y MEDIO/)
  assert.match(prompt, /## El momento: TRANQUI, antes de dormir/)
  assert.doesNotMatch(prompt, /UN AÑO|DOS AÑOS|CUATRO AÑOS|CINCO AÑOS/)
  assert.doesNotMatch(prompt, /CON PILAS/)
  assert.equal(prompt.match(/## Cómo se escribe/g).length, 1)
})

test('a band or a moment with no fragment is a bug, not a quiet story', () => {
  assert.throws(() => systemPrompt({ band: '9', mood: 'calm' }), /No prompt fragment for the band 9/)
  assert.throws(() => systemPrompt({ band: '1', mood: /** @type {any} */ ('fiesta') }), /No prompt fragment for the moment fiesta/)
})

test('the family lines name only what the castings hold, each name once', () => {
  const profile = profileOf([{ name: 'Milán', ageMonths: 26 }, { name: 'Sofi', ageMonths: 52 }])
  const one = familyLines(profile, [
    /** @type {any} */ ({ kids: ['k1'], pet: null, toy: { id: 't', name: 'el tren grandote' }, theme: null }),
  ])
  assert.equal(one.kids, 'Sofi, de 4 años y 4 meses')
  assert.equal(one.pet, 'no aparece en este cuento')
  assert.equal(one.toys, 'el tren grandote')
  assert.equal(one.interests, 'sin tema fijo')
  assert.equal(one.parents, '')

  // The three castings of a screen share one prompt, so the lines are their union.
  const screen = familyLines(profile, [
    /** @type {any} */ ({ kids: ['k0'], pet: { id: 'p', name: 'Inca' }, toy: null, theme: 'los dinosaurios' }),
    /** @type {any} */ ({ kids: ['k0', 'k1'], pet: { id: 'p', name: 'Inca' }, toy: { id: 't', name: 'el tren grandote' }, theme: null }),
    /** @type {any} */ ({ kids: ['k1'], pet: null, toy: null, theme: 'los caballos' }),
  ])
  assert.equal(screen.kids, 'Milán, de 2 años y 2 meses y Sofi, de 4 años y 4 meses')
  assert.equal(screen.pet, 'Inca (perro)')
  assert.equal(screen.toys, 'el tren grandote')
  assert.equal(screen.interests, 'los dinosaurios, los caballos')
})

test('the parents are a line of their own, by what the kids call them, and a pet of another animal goes by its name', () => {
  const profile = {
    ...profileOf([{ name: 'Milán', ageMonths: 26 }]),
    parents: [
      { id: 'a', name: 'Caro', calledAs: 'Mamá' },
      { id: 'b', name: 'Alex', calledAs: 'Papi' },
    ],
    pets: [{ id: 'p', name: 'Toto', kind: 'otro' }],
  }
  const lines = familyLines(profile, [/** @type {any} */ ({ kids: ['k0'], pet: { id: 'p', name: 'Toto' }, toy: null, theme: null })])
  assert.equal(lines.pet, 'Toto')
  assert.match(lines.parents, /^\nLos padres: Caro, a quien le dicen Mamá; Alex, a quien le dicen Papi\./)
})

/** Feeds a text to a parser in small pieces, as the model writes it. @param {string} text @param {number} [size] */
const streamed = (text, size = 5) => {
  const parser = new OptionsParser()
  const found = []
  for (let index = 0; index < text.length; index += size) found.push(...parser.push(text.slice(index, index + size)))
  return found
}

const PLOT = { title: 'Milán y el tren.', teaser: 'Un paseo.', minutes: 4, premise: 'Salen. Vuelven.' }

test('the plots come out of the answer one at a time, as the model writes them', () => {
  const answer = JSON.stringify({ tramas: [PLOT, { ...PLOT, title: 'La segunda.' }, { ...PLOT, title: 'La tercera.' }] })
  for (const size of [1, 3, 17, answer.length]) {
    assert.deepEqual(
      streamed(answer, size).map((option) => option.title),
      ['Milán y el tren.', 'La segunda.', 'La tercera.'],
      `read in pieces of ${size}`,
    )
  }
})

test('the parser finds the plots behind fences, prose, and a bare array', () => {
  for (const answer of [
    JSON.stringify([PLOT]),
    JSON.stringify({ tramas: [PLOT] }),
    '```json\n' + JSON.stringify({ tramas: [PLOT] }) + '\n```',
    'Acá van las tramas:\n' + JSON.stringify({ tramas: [PLOT] }),
  ]) {
    assert.deepEqual(streamed(answer), [PLOT])
  }
  assert.deepEqual(streamed('no hay json acá'), [])
})

test('braces and brackets inside a title are part of the title, not the JSON', () => {
  const tricky = { ...PLOT, title: 'Milán y el {tren} [grandote].', premise: 'Dice «}» y se ríe. Fin.' }
  assert.deepEqual(streamed(JSON.stringify({ tramas: [tricky] })), [tricky])
})

test('a nested object is read with its plot, and nothing after the array is', () => {
  const answer = JSON.stringify({ tramas: [{ ...PLOT, extra: { a: 1 } }] }) + JSON.stringify({ title: 'Después.' })
  const found = streamed(answer)
  assert.equal(found.length, 1)
  assert.equal(found[0].title, PLOT.title)
})

test('a plot that stops half-written is not offered, and the ones before it are', () => {
  const answer = `{"tramas": [${JSON.stringify(PLOT)}, {"title": "A medio es`
  assert.deepEqual(streamed(answer).map((option) => option.title), ['Milán y el tren.'])
})

test('an option becomes a plot only when it has a title, a teaser and a premise', () => {
  const band = anchorOf(profileOf([{ name: 'Milán', ageMonths: 26 }])).band
  assert.deepEqual(toPlot(PLOT, band), PLOT)
  assert.equal(toPlot({ title: 'Sin premisa', teaser: 'Nada.' }, band), null)
  assert.equal(toPlot(null, band), null)
  // The minutes come back inside the band whatever the model asked for.
  assert.equal(toPlot({ ...PLOT, minutes: 9 }, band)?.minutes, 4)
})

test('the minutes stay inside the band, and an answer without them gets its shortest story', () => {
  const band = { id: '2', maxMonths: 29, minutes: /** @type {[number, number]} */ ([3, 4]), words: /** @type {[number, number]} */ ([350, 480]) }
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

test('an age reads aloud in years and months', () => {
  assert.equal(ageLine(8), '8 meses')
  assert.equal(ageLine(12), '1 año')
  assert.equal(ageLine(13), '1 año y 1 mes')
  assert.equal(ageLine(22), '1 año y 10 meses')
  assert.equal(ageLine(52), '4 años y 4 meses')
})

test('the moment follows the Buenos Aires clock', () => {
  assert.equal(moodAt(new Date('2026-09-14T21:00:00-03:00')), 'calm')
  assert.equal(moodAt(new Date('2026-09-14T20:00:00Z')), 'lively')
})

test('a TÍTULO line before the first part is read, and handed back once', () => {
  const parser = new StoryParser()
  const done = parser.push('TÍTULO: Milán y los dinosaurios.\nPARTE 1\nSalieron a la plaza.\n\n')
  assert.equal(parser.takeTitle(), 'Milán y los dinosaurios.')
  assert.equal(parser.takeTitle(), '', 'a story is announced once')
  assert.deepEqual(done, [{ part: 1, text: 'Salieron a la plaza.' }])
})

test('the title line is read however it arrives, and a story without one has none', () => {
  const split = new StoryParser()
  split.push('TÍTU')
  split.push('LO:  Milán y el tren.  \nPARTE 1\n')
  assert.equal(split.takeTitle(), 'Milán y el tren.')

  const untitled = new StoryParser()
  untitled.push('PARTE 1\nMilán se despertó.\n\n')
  assert.equal(untitled.takeTitle(), '')
})

test('a title said inside the story is a paragraph, not the title', () => {
  const parser = new StoryParser()
  const done = parser.push('PARTE 1\nTítulo: eso lo dice un personaje.\n\n')
  assert.equal(parser.takeTitle(), '')
  assert.deepEqual(done, [{ part: 1, text: 'Título: eso lo dice un personaje.' }])
})

test('an episode answer keeps its bookkeeping out of the story (JUG-59)', () => {
  const parser = new StoryParser()
  const answer = `SERIE: Las tardes de Milán.
LUGAR: la plaza de la esquina
ANTES: Milán salió con el tren.
TÍTULO: Milán y la caracola.

PARTE 1
Milán se despertó.

PARTE 2
Encontró un caracol.

RESUMEN: Milán conoció a Caracola.
PERSONAJES: Caracola: un caracol lento
`
  /** @type {{ part: number, text: string }[]} */
  const done = []
  // In pieces, the way the model writes it.
  for (let at = 0; at < answer.length; at += 5) done.push(...parser.push(answer.slice(at, at + 5)))
  assert.equal(parser.takeTitle(), 'Milán y la caracola.')
  done.push(...parser.end())

  assert.deepEqual(done, [
    { part: 1, text: 'Milán se despertó.' },
    { part: 2, text: 'Encontró un caracol.' },
  ])
  assert.deepEqual(parser.takeFields(), {
    series: 'Las tardes de Milán.',
    setting: 'la plaza de la esquina',
    before: 'Milán salió con el tren.',
    summary: 'Milán conoció a Caracola.',
    characters: 'Caracola: un caracol lento',
  })
})

test('the characters of a series are read, and the ones it already had are kept', () => {
  assert.deepEqual(charactersIn('Caracola: un caracol lento; Don Sapo (salta alto); La luna'), [
    { name: 'Caracola', note: 'un caracol lento' },
    { name: 'Don Sapo', note: 'salta alto' },
    { name: 'La luna', note: '' },
  ])
  assert.deepEqual(charactersIn('   '), [])

  const kept = [{ name: 'Caracola', note: 'un caracol lento' }]
  assert.deepEqual(mergeCharacters(kept, charactersIn('Caracola: otro caracol; Don Sapo: salta alto')), [
    { name: 'Caracola', note: 'un caracol lento' },
    { name: 'Don Sapo', note: 'salta alto' },
  ])
  assert.deepEqual(mergeCharacters([{ name: 'Caracola', note: '' }], charactersIn('Caracola: un caracol lento')), [
    { name: 'Caracola', note: 'un caracol lento' },
  ])
})

test('the series and its episodes reach the prompt without the parts it does not know yet', () => {
  const series = { title: 'Las tardes de Milán.', storyline: 'Juegan en la plaza.', setting: '', characters: [] }
  assert.equal(seriesLines(series), 'La serie se llama «Las tardes de Milán.».\nEl hilo de la serie, que ningún episodio cambia: Juegan en la plaza.')

  const known = seriesLines({ ...series, setting: 'la plaza', characters: [{ name: 'Caracola', note: 'un caracol' }] })
  assert.match(known, /Dónde pasa: la plaza/)
  assert.match(known, /Personajes que ya aparecieron y podés traer de vuelta: Caracola \(un caracol\)/)

  assert.equal(
    episodeLines([
      { episode: 1, title: 'Uno', summary: 'Pasó algo.' },
      { episode: 2, title: 'Dos', summary: '' },
    ]),
    '1. «Uno»: Pasó algo.\n2. «Dos»',
  )
})
