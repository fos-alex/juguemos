import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createFamiliesService } from '../src/families/families.service.js'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
/** @type {import('../src/families/families.service.js').FamiliesService} */
let families
before(async () => {
  api = await startApi({
    signupEmails: ['ana@example.com', 'beto@example.com', 'carla@example.com', 'dani@example.com', 'eva@example.com'],
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
  const { rows: before } = await api.db.query('select count(*)::int as n from families')

  await assert.rejects(families.create(user.id), { code: '23505' })
  const { rows: after } = await api.db.query('select count(*)::int as n from families')
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
  assert.deepEqual(profile.interests, ['los dinosaurios', 'los caballos'])
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
      kids: first.kids,
      pets: [],
      interests: ['los trenes'],
      toys: [{ id: dino.id, name: 'el dino' }, { name: 'la pelota' }],
    })
  ).json()

  assert.equal(second.id, first.id)
  assert.equal(second.kids[0].id, first.kids[0].id)
  assert.deepEqual(second.pets, [])
  assert.deepEqual(second.interests, ['los trenes'])
  assert.deepEqual(
    second.toys.map((toy) => toy.name),
    ['el dino', 'la pelota'],
  )
  assert.equal(second.toys[0].id, dino.id)
  const { rows } = await api.db.query('select count(*)::int as n from toys where family_id = $1', [first.id])
  assert.equal(rows[0].n, 2)
})

test('an age keeps counting from the day it was given', async () => {
  const { cookie } = await signUpAs(api, 'eva@example.com')
  const profile = (await putFamily(api, cookie, EXAMPLE_PROFILE)).json()
  const [kid] = profile.kids
  await api.db.query(`update kids set age_set_on = current_date - interval '1 year' where id = $1`, [kid.id])

  const aged = (await getFamily(cookie)).json()
  assert.equal(aged.kids[0].age, 3)

  // Saving the form again sends the age it showed, which must not restart the count.
  await putFamily(api, cookie, { ...EXAMPLE_PROFILE, kids: aged.kids })
  const { rows } = await api.db.query(`select age_years, age_set_on < current_date as counting from kids where id = $1`, [
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
