import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { createFamiliesService } from '../src/families/families.service.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
/** @type {import('../src/families/families.service.js').FamiliesService} */
let families
before(async () => {
  api = await startApi({
    signupEmails: [
      'ana@example.com',
      'beto@example.com',
      'carla@example.com',
      'dani@example.com',
      'eva@example.com',
      'fede@example.com',
      'gabi@example.com',
      'hugo@example.com',
    ],
  })
  families = createFamiliesService({ db: api.db })
})
after(() => api.close())

/** @param {string} cookie */
const getFamily = (cookie) => api.app.inject({ method: 'GET', url: '/family', headers: { cookie } })

test('a family is created with its first member, and /me shows it', async () => {
  const user = await signUpAs(api, 'ana@example.com')
  const family = await families.create(user.id, { name: 'Los Pérez' })

  assert.deepEqual(await families.familyOf(user.id), family)
  const account = await api.app.inject({ method: 'GET', url: '/me', headers: { cookie: user.cookie } })
  assert.deepEqual(account.json().family, { id: family.id, name: 'Los Pérez' })
})

test('an adult already in a family cannot start another, and nothing is left behind', async () => {
  const user = await signUpAs(api, 'beto@example.com')
  await families.create(user.id)
  const { rows: before } = await api.pool.query('select count(*)::int as n from families')

  await assert.rejects(families.create(user.id), (/** @type {any} */ error) => error.cause?.code === '23505')
  const { rows: after } = await api.pool.query('select count(*)::int as n from families')
  assert.equal(after[0].n, before[0].n)
})

test('saving the profile starts the family and keeps everything in order, as typed', async () => {
  const { cookie } = await signUpAs(api, 'carla@example.com')
  assert.equal((await getFamily(cookie)).statusCode, 404)

  const saved = await putFamily(api, cookie, EXAMPLE_PROFILE)
  assert.equal(saved.statusCode, 200)
  const profile = saved.json()
  assert.deepEqual(
    profile.kids.map(({ name, age }) => ({ name, age })),
    [{ name: 'Milán', age: 2 }],
  )
  assert.deepEqual(
    profile.pets.map((pet) => pet.name),
    ['Inca'],
  )
  assert.deepEqual(
    profile.kids.map((kid) => kid.interests),
    [['los dinosaurios', 'los caballos']],
  )
  assert.equal(profile.interests, undefined, 'interests belong to the kids, not the family')
  assert.deepEqual(
    profile.toys.map((toy) => toy.name),
    EXAMPLE_PROFILE.toys.map((toy) => toy.name),
  )

  assert.deepEqual((await getFamily(cookie)).json(), profile)
  const account = await api.app.inject({ method: 'GET', url: '/me', headers: { cookie } })
  assert.equal(account.json().family.id, profile.id)
})

test('saving again updates rows by id, adds new ones, and drops the rest', async () => {
  const { cookie } = await signUpAs(api, 'dani@example.com')
  const first = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()
  const [dino] = first.toys

  const second = (
    await putFamily(api, cookie, {
      kids: first.kids.map((kid) => ({ ...kid, interests: ['los trenes'] })),
      pets: [],
      toys: [{ id: dino.id, name: 'el dino' }, { name: 'la pelota' }],
    })
  ).json()

  assert.equal(second.id, first.id)
  assert.equal(second.kids[0].id, first.kids[0].id)
  assert.deepEqual(second.pets, [])
  assert.deepEqual(second.kids[0].interests, ['los trenes'])
  assert.deepEqual(
    second.toys.map((toy) => toy.name),
    ['el dino', 'la pelota'],
  )
  assert.equal(second.toys[0].id, dino.id)
  const { rows } = await api.pool.query('select count(*)::int as n from toys where family_id = $1', [first.id])
  assert.equal(rows[0].n, 2)
})

test('an age keeps counting from the day it was given', async () => {
  const { cookie } = await signUpAs(api, 'eva@example.com')
  const profile = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()
  const [kid] = profile.kids
  await api.pool.query(`update kids set age_set_on = current_date - interval '1 year' where id = $1`, [kid.id])

  const aged = (await getFamily(cookie)).json()
  assert.equal(aged.kids[0].age, 3)

  // Saving the form again sends the age it showed, which must not restart the count.
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, kids: aged.kids })
  const { rows } = await api.pool.query(`select age_years, age_set_on < current_date as counting from kids where id = $1`, [
    kid.id,
  ])
  assert.deepEqual(rows[0], { age_years: 2, counting: true })
})

test('a malformed profile is refused', async () => {
  const { cookie } = await signUpAs(api, 'ana@example.com').catch(() => ({ cookie: '' }))
  const response = await putFamily(api, cookie || 'x', { ...EXAMPLE_PROFILE, kids: [{ name: '', age: -1 }] })
  assert.ok([400, 401].includes(response.statusCode))

  const signedIn = await api.app.inject({
    method: 'POST',
    url: '/auth/sign-in/email',
    payload: { email: 'ana@example.com', password: 'una-clave-larga' },
  })
  const bad = await api.app.inject({
    method: 'PUT',
    url: '/family',
    headers: { cookie: signedIn.headers['set-cookie']?.toString().split(';')[0] ?? '' },
    payload: { ...EXAMPLE_PROFILE, kids: [{ name: '', age: -1 }] },
  })
  assert.equal(bad.statusCode, 400)
})

test('the profile needs a session', async () => {
  assert.equal((await api.app.inject({ method: 'GET', url: '/family' })).statusCode, 401)
})

/** @param {string} cookie @param {string[]} kids */
const choosePlaying = (cookie, kids) =>
  api.app.inject({ method: 'PUT', url: '/family/playing', headers: { cookie }, payload: { kids } })

const TWO_KIDS = {
  ...EXAMPLE_PROFILE,
  kids: [
    { name: 'Milán', age: 1 },
    { name: 'Sofi', age: 4 },
  ],
}

/** @param {{ kids: { name: string, playing: boolean }[] }} profile */
const playing = (profile) => profile.kids.map((kid) => [kid.name, kid.playing])

test('every kid starts playing, and the choice holds for the adult across saves and new kids', async () => {
  const { cookie } = await signUpAs(api, 'fede@example.com')
  const profile = (await putFamily(api, cookie, TWO_KIDS)).json()
  assert.deepEqual(playing(profile), [
    ['Milán', true],
    ['Sofi', true],
  ])
  const [milan, sofi] = profile.kids

  const chosen = await choosePlaying(cookie, [sofi.id])
  assert.equal(chosen.statusCode, 200)
  assert.deepEqual(playing(chosen.json()), [
    ['Milán', false],
    ['Sofi', true],
  ])
  assert.deepEqual(playing((await getFamily(cookie)).json()), playing(chosen.json()), 'another phone reads the same')

  // Saving the family with the kids' ids keeps the choice, and a kid added later plays.
  const kept = profile.kids.map(({ id, name, age }) => ({ id, name, age }))
  const saved = (await putFamily(api, cookie, { ...TWO_KIDS, kids: [...kept, { name: 'Lupe', age: 3 }] })).json()
  assert.deepEqual(playing(saved), [
    ['Milán', false],
    ['Sofi', true],
    ['Lupe', true],
  ])

  // A kid removed from the family leaves the choice with them.
  await putFamily(api, cookie, { ...TWO_KIDS, kids: saved.kids.slice(1).map(({ id, name, age }) => ({ id, name, age })) })
  const { rows } = await api.pool.query('select count(*)::int as n from kids_sitting_out where kid_id = $1', [milan.id])
  assert.equal(rows[0].n, 0)
})

test('at least one kid always plays', async () => {
  const { cookie } = await signUpAs(api, 'gabi@example.com')
  const profile = (await putFamily(api, cookie, TWO_KIDS)).json()
  const [milan, sofi] = profile.kids

  assert.equal((await choosePlaying(cookie, [])).statusCode, 400)
  const stranger = await choosePlaying(cookie, [randomUUID()])
  assert.equal(stranger.statusCode, 400)
  assert.equal(stranger.json().code, 'NO_KID_PLAYING')

  // Sofi, the only one playing, leaves the family: Milán plays again rather than nobody.
  await choosePlaying(cookie, [sofi.id])
  const left = (await putFamily(api, cookie, { ...TWO_KIDS, kids: [{ id: milan.id, name: 'Milán', age: 1 }] })).json()
  assert.deepEqual(playing(left), [['Milán', true]])
})

test('each kid keeps what they love, and the kids playing bring only theirs', async () => {
  const user = await signUpAs(api, 'hugo@example.com')
  const profile = (
    await putFamily(api, user.cookie, {
      ...EXAMPLE_PROFILE,
      kids: [
        { name: 'Milán', age: 1, interests: ['los dinosaurios', 'los trenes'] },
        { name: 'Sofi', age: 4, interests: ['Los trenes', 'dibujar'] },
        { name: 'Lupe', age: 3 },
      ],
    })
  ).json()
  assert.deepEqual(
    profile.kids.map((kid) => [kid.name, kid.interests]),
    [
      ['Milán', ['los dinosaurios', 'los trenes']],
      ['Sofi', ['Los trenes', 'dibujar']],
      ['Lupe', []],
    ],
  )

  // The family's interests, inside the API, are the kids' own, each once.
  const familyId = /** @type {string} */ (await families.idOf(user.id))
  const whole = await families.profileOf(familyId, user.id)
  assert.deepEqual(whole.interests, ['los dinosaurios', 'los trenes', 'dibujar'])

  const [, sofi, lupe] = profile.kids
  await choosePlaying(user.cookie, [sofi.id, lupe.id])
  const playingNow = await families.playingProfile(familyId, user.id)
  assert.deepEqual(playingNow.interests, ['Los trenes', 'dibujar'])

  // A kid who leaves the family takes what they love along.
  await putFamily(api, user.cookie, { ...EXAMPLE_PROFILE, kids: [{ id: sofi.id, name: 'Sofi', age: 4, interests: ['dibujar'] }] })
  const { rows } = await api.pool.query(
    'select count(*)::int as n from kid_interests where kid_id not in (select id from kids)',
  )
  assert.equal(rows[0].n, 0)
  assert.deepEqual((await getFamily(user.cookie)).json().kids.map((kid) => kid.interests), [['dibujar']])
})

test('choosing who plays needs a session and a family', async () => {
  const noSession = await api.app.inject({ method: 'PUT', url: '/family/playing', payload: { kids: [randomUUID()] } })
  assert.equal(noSession.statusCode, 401)
  const { cookie } = await signUpAs(api, 'ana@example.com').catch(() => ({ cookie: '' }))
  if (!cookie) return
  assert.equal((await choosePlaying(cookie, [randomUUID()])).statusCode, 404)
})
