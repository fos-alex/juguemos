import assert from 'node:assert/strict'
import { test } from 'node:test'
import { betaSample, DEFAULT_WEIGHTS, jaccard, rank } from '../../src/activities/ranking.js'
import { seededRandom } from '../../src/catalog/slots.js'

const NOW = new Date('2026-09-16T15:00:00Z')
const DAY = 86_400_000

/** @param {Partial<import('../../src/catalog/catalog.service.js').FillableActivityTemplate> & { slug: string }} overrides */
const template = (overrides) => ({
  id: overrides.slug,
  title: overrides.slug,
  minutes: 10,
  place: /** @type {const} */ ('indoor'),
  minAgeMonths: 12,
  maxAgeMonths: 47,
  energy: /** @type {const} */ ('medium'),
  categories: ['pretend'],
  smallSpace: true,
  materials: [],
  themes: [],
  skills: [],
  safety: [],
  why: '',
  needs: '',
  steps: ['Jueguen.'],
  easier: '',
  harder: '',
  active: true,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
  texts: [overrides.slug],
  ...overrides,
})

/** A candidate with the plainest fill. @param {ReturnType<typeof template>} each */
const candidate = (each, fill = { kid: 'Milán', toy: 'la pelota' }) => ({ template: each, fill })

/** @param {Partial<Parameters<typeof rank>[1]>} [overrides] */
const context = (overrides) => ({
  interestThemes: [],
  favoriteToys: [],
  history: [],
  others: new Map(),
  catalog: [],
  now: NOW,
  random: seededRandom('ranking'),
  ...overrides,
})

/** @param {Date} when @param {'up' | 'down' | null} [reaction] */
const seen = (/** @type {string} */ templateId, when, reaction = null) => ({ templateId, createdAt: when, reaction })
/** @param {number} days */
const daysAgo = (days) => new Date(NOW.getTime() - days * DAY)

/**
 * How often a slug wins over many seeds, from 0 to 1.
 * @param {ReturnType<typeof candidate>[]} candidates
 * @param {Partial<Parameters<typeof rank>[1]>} overrides
 * @param {string} slug
 */
function winRate(candidates, overrides, slug, rounds = 200) {
  let wins = 0
  for (let round = 0; round < rounds; round++) {
    const [first] = rank(candidates, context({ ...overrides, random: seededRandom(`round-${round}`) }))
    if (first.template.slug === slug) wins++
  }
  return wins / rounds
}

test('the ranking is deterministic for a seed, and different across seeds', () => {
  const candidates = ['a', 'b', 'c', 'd'].map((slug) => candidate(template({ slug })))
  const order = () => rank(candidates, context({ random: seededRandom('one') })).map((each) => each.template.slug)
  assert.deepEqual(order(), order())
  const other = rank(candidates, context({ random: seededRandom('two') })).map((each) => each.template.slug)
  assert.notDeepEqual(order(), other)
})

test('a template about something a kid loves gains, and the pick says which themes', () => {
  const dinos = candidate(template({ slug: 'dinos', themes: ['dinosaurios', 'animales'] }))
  const plain = candidate(template({ slug: 'plain', themes: ['agua'] }))
  const ranked = rank([plain, dinos], context({ interestThemes: ['dinosaurios'] }))
  const pick = (/** @type {string} */ slug) => /** @type {any} */ (ranked.find((each) => each.template.slug === slug)).pick
  assert.equal(pick('dinos').fit, 1 + DEFAULT_WEIGHTS.interest)
  assert.deepEqual(pick('dinos').themes, ['dinosaurios'])
  assert.equal(pick('plain').fit, 1)
  assert.deepEqual(pick('plain').themes, [])
  assert.ok(winRate([plain, dinos], { interestThemes: ['dinosaurios'] }, 'dinos') > 0.8)
})

test('a template that names an interest gains, and one that drew a favorite toy gains', () => {
  const named = candidate(template({ slug: 'named', texts: ['Cosas como {interest}'] }))
  const favorite = candidate(template({ slug: 'favorite' }), { kid: 'Milán', toy: 'el osito' })
  const plain = candidate(template({ slug: 'plain' }))
  const ranked = rank([plain, named, favorite], context({ favoriteToys: ['el osito'] }))
  const pick = (/** @type {string} */ slug) => /** @type {any} */ (ranked.find((each) => each.template.slug === slug)).pick
  assert.equal(pick('named').fit, 1 + DEFAULT_WEIGHTS.named)
  assert.equal(pick('named').named, true)
  assert.equal(pick('favorite').fit, 1 + DEFAULT_WEIGHTS.favorite)
  assert.equal(pick('favorite').favorite, true)
  assert.equal(pick('plain').fit, 1)
})

test('a template the family gave a thumbs down to is out, unless nothing else is left', () => {
  const a = candidate(template({ slug: 'a' }))
  const b = candidate(template({ slug: 'b' }))
  const history = [seen('a', daysAgo(20), 'down')]
  assert.deepEqual(
    rank([a, b], context({ history })).map((each) => each.template.slug),
    ['b'],
  )
  assert.deepEqual(
    rank([a], context({ history })).map((each) => each.template.slug),
    ['a'],
  )
  // A later thumbs up on the same template lets it back in.
  const forgiven = [seen('a', daysAgo(2), 'up'), seen('a', daysAgo(20), 'down')]
  assert.equal(rank([a, b], context({ history: forgiven })).length, 2)
})

test('the juego being left is out, and what is like it loses by the similarity', () => {
  const left = template({ slug: 'left', categories: ['move'], themes: ['cuerpo'], energy: 'high' })
  const alike = candidate(template({ slug: 'alike', categories: ['move'], themes: ['cuerpo'], energy: 'high' }))
  const unlike = candidate(template({ slug: 'unlike', categories: ['create'], themes: ['dibujar'], energy: 'low' }))
  const ranked = rank([candidate(left), alike, unlike], context({ after: left }))
  assert.ok(!ranked.some((each) => each.template.slug === 'left'))
  const pick = (/** @type {string} */ slug) => /** @type {any} */ (ranked.find((each) => each.template.slug === slug)).pick
  assert.ok(pick('alike').difference < pick('unlike').difference)
  assert.equal(pick('alike').difference, 1 - DEFAULT_WEIGHTS.different * jaccard(new Set(['x']), new Set(['x'])))
  assert.ok(winRate([alike, unlike], { after: left }, 'unlike') > 0.95)
  // When it is the only one, it comes back rather than nothing.
  assert.equal(rank([candidate(left)], context({ after: left }))[0].template.slug, 'left')
})

test('a template seen lately waits, most of the way back after seenDays, and never to zero', () => {
  const fresh = candidate(template({ slug: 'fresh' }))
  const justSeen = candidate(template({ slug: 'just-seen' }))
  const oldSeen = candidate(template({ slug: 'old-seen' }))
  const history = [seen('just-seen', daysAgo(0.01)), seen('old-seen', daysAgo(30))]
  const ranked = rank([justSeen, oldSeen, fresh], context({ history }))
  const pick = (/** @type {string} */ slug) => /** @type {any} */ (ranked.find((each) => each.template.slug === slug)).pick
  assert.equal(pick('fresh').freshness, 1)
  assert.equal(pick('just-seen').freshness, DEFAULT_WEIGHTS.floor)
  assert.ok(pick('old-seen').freshness > 0.99)
  assert.ok(winRate([justSeen, fresh], { history }, 'fresh') > 0.99)
  assert.equal(rank([justSeen], context({ history }))[0].template.slug, 'just-seen')
})

test('a template the family said they played waits longer than one they only saw', () => {
  const played = candidate(template({ slug: 'played' }))
  const looked = candidate(template({ slug: 'looked' }))
  const history = [seen('played', daysAgo(4), 'up'), seen('looked', daysAgo(4))]
  const ranked = rank([played, looked], context({ history }))
  const pick = (/** @type {string} */ slug) => /** @type {any} */ (ranked.find((each) => each.template.slug === slug)).pick
  assert.ok(pick('played').freshness < pick('looked').freshness)
})

test('thumbs up from the family make a template win more often, without making it certain', () => {
  const liked = candidate(template({ slug: 'liked' }))
  const other = candidate(template({ slug: 'other' }))
  const history = [1, 2, 3, 4, 5].map((days) => seen('liked', daysAgo(days + 30), 'up'))
  const rate = winRate([liked, other], { history }, 'liked')
  assert.ok(rate > 0.75, `won ${rate}`)
  assert.ok(rate < 0.99, `won ${rate}`)
  const [first] = rank([liked, other], context({ history }))
  const liking = /** @type {any} */ (rank([liked, other], context({ history })).find((each) => each.template.slug === 'liked')).pick
  assert.equal(liking.feedback.alpha, DEFAULT_WEIGHTS.prior + 5)
  assert.equal(liking.feedback.beta, DEFAULT_WEIGHTS.prior)
  assert.ok(first.pick.feedback.sample >= 0 && first.pick.feedback.sample <= 1)
})

test('other families reactions count at a fraction of the family own', () => {
  const liked = candidate(template({ slug: 'liked' }))
  const other = candidate(template({ slug: 'other' }))
  const others = new Map([['liked', { ups: 10, downs: 0 }]])
  const liking = /** @type {any} */ (rank([liked, other], context({ others })).find((each) => each.template.slug === 'liked')).pick
  assert.equal(liking.feedback.alpha, DEFAULT_WEIGHTS.prior + 10 * DEFAULT_WEIGHTS.others)
  assert.ok(winRate([liked, other], { others }, 'liked') > 0.7)
  const disliked = new Map([['liked', { ups: 0, downs: 10 }]])
  assert.ok(winRate([liked, other], { others: disliked }, 'liked') < 0.3)
})

test('a reaction to a similar template counts by the similarity, so a thumbs down spreads to games like it', () => {
  const downed = template({ slug: 'downed', categories: ['move'], themes: ['cuerpo'], energy: 'high' })
  const alike = candidate(template({ slug: 'alike', categories: ['move'], themes: ['cuerpo'], energy: 'high' }))
  const unlike = candidate(template({ slug: 'unlike', categories: ['create'], themes: ['dibujar'], energy: 'low' }))
  const history = [seen('downed', daysAgo(10), 'down')]
  const ranked = rank([alike, unlike], context({ history, catalog: [downed, alike.template, unlike.template] }))
  const pick = (/** @type {string} */ slug) => /** @type {any} */ (ranked.find((each) => each.template.slug === slug)).pick
  assert.ok(pick('alike').feedback.beta > pick('unlike').feedback.beta)
  assert.ok(pick('alike').feedback.beta > DEFAULT_WEIGHTS.prior)
  // A template the catalog no longer has spreads nothing.
  const gone = rank([alike, unlike], context({ history, catalog: [] }))
  assert.equal(/** @type {any} */ (gone.find((each) => each.template.slug === 'alike')).pick.feedback.beta, DEFAULT_WEIGHTS.prior)
})

test('the pick keeps every part of the score and the weights', () => {
  const [first] = rank([candidate(template({ slug: 'a' }))], context())
  assert.deepEqual(Object.keys(first.pick).sort(), [
    'difference', 'favorite', 'feedback', 'fit', 'freshness', 'named', 'score', 'themes', 'weights',
  ])
  assert.equal(first.pick.score, first.pick.fit * 2 * first.pick.feedback.sample * first.pick.freshness * first.pick.difference)
  assert.deepEqual(first.pick.weights, DEFAULT_WEIGHTS)
})

test('a beta draw stays in [0, 1] and averages alpha over alpha plus beta', () => {
  const random = seededRandom('beta')
  for (const [alpha, beta] of [[1, 1], [3, 3], [8, 2], [0.5, 0.5], [2, 9]]) {
    let sum = 0
    const rounds = 2000
    for (let round = 0; round < rounds; round++) {
      const draw = betaSample(alpha, beta, random)
      assert.ok(draw >= 0 && draw <= 1)
      sum += draw
    }
    assert.ok(Math.abs(sum / rounds - alpha / (alpha + beta)) < 0.03, `Beta(${alpha}, ${beta}) averaged ${sum / rounds}`)
  }
})

test('jaccard is the shared tags over all the tags', () => {
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['b', 'c'])), 1 / 3)
  assert.equal(jaccard(new Set(['a']), new Set(['a'])), 1)
  assert.equal(jaccard(new Set(), new Set()), 0)
})
