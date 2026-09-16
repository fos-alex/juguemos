import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

const EMAILS = ['ana', 'beto', 'carla', 'dani', 'eva', 'fede', 'gabi', 'hugo', 'ines', 'juan', 'kari', 'lola'].map(
  (name) => `${name}@example.com`,
)

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({ signupEmails: EMAILS })
})
after(() => api.close())

/**
 * A new adult with a family saved, and a way to call the API as them.
 * @param {string} email
 * @param {object} [family]
 */
async function adultWithFamily(email, family = EXAMPLE_PROFILE) {
  const { cookie } = await signUpAs(api, email)
  const profile = (await putFamily(api, cookie, family)).json()
  /** @param {'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'} method @param {string} url @param {object} [payload] */
  const call = (method, url, payload) => api.app.inject({ method, url, headers: { cookie }, payload })
  return { cookie, profile, call }
}

/** @typedef {{ id: string, name: string, linked: string[] } & Record<string, unknown>} Toy */

/** @param {Toy[]} toys @param {string} name */
const named = (toys, name) => toys.find((toy) => toy.name === name)

/** Which toys each toy is linked with, by id. @param {Toy[]} toys */
const links = (toys) => Object.fromEntries(toys.map((toy) => [toy.id, [...toy.linked].sort()]))

test('toys from the family form come into the box with only a name', async () => {
  const { call } = await adultWithFamily('ana@example.com')
  const response = await call('GET', '/family/toys')
  assert.equal(response.statusCode, 200)
  assert.deepEqual(
    response.json().toys.map((/** @type {Toy} */ { id, ...toy }) => toy),
    EXAMPLE_PROFILE.toys.map(({ name }) => ({
      name,
      aliases: [],
      description: null,
      kidId: null,
      shared: false,
      favorite: false,
      linked: [],
    })),
  )
})

test('a new toy goes at the end with its name exactly as typed, and the profile knows it only by that name', async () => {
  const { call } = await adultWithFamily('beto@example.com')
  const added = await call('POST', '/family/toys', {
    name: 'el Tuto  de Milán ',
    aliases: ['el tuto'],
    description: 'Oso de peluche, unos 30 cm',
    favorite: true,
  })
  assert.equal(added.statusCode, 201)
  const toy = added.json()
  assert.deepEqual(
    { name: toy.name, aliases: toy.aliases, description: toy.description, favorite: toy.favorite },
    { name: 'el Tuto  de Milán ', aliases: ['el tuto'], description: 'Oso de peluche, unos 30 cm', favorite: true },
  )

  const box = (await call('GET', '/family/toys')).json().toys
  assert.equal(box.at(-1).id, toy.id)
  // Activities and stories fill toys from the profile, which carries the family name and nothing else.
  const family = (await call('GET', '/family')).json()
  assert.deepEqual(family.toys.at(-1), { id: toy.id, name: 'el Tuto  de Milán ' })
})

test('editing renames a toy, and whose it is moves between a kid and shared', async () => {
  const { call, profile } = await adultWithFamily('carla@example.com')
  const [dino] = profile.toys
  const [milan] = profile.kids
  const url = `/family/toys/${dino.id}`

  const renamed = await call('PATCH', url, { name: 'el dino', kidId: milan.id })
  assert.equal(renamed.statusCode, 200)
  assert.deepEqual(
    { id: renamed.json().id, name: renamed.json().name, kidId: renamed.json().kidId, shared: renamed.json().shared },
    { id: dino.id, name: 'el dino', kidId: milan.id, shared: false },
  )

  const shared = (await call('PATCH', url, { shared: true })).json()
  assert.deepEqual({ kidId: shared.kidId, shared: shared.shared }, { kidId: null, shared: true })
  const milans = (await call('PATCH', url, { kidId: milan.id })).json()
  assert.deepEqual({ kidId: milans.kidId, shared: milans.shared }, { kidId: milan.id, shared: false })
  // A change to something else leaves whose it is alone.
  const described = (await call('PATCH', url, { description: 'T-rex de plástico duro' })).json()
  assert.deepEqual({ kidId: described.kidId, description: described.description, name: described.name }, {
    kidId: milan.id,
    description: 'T-rex de plástico duro',
    name: 'el dino',
  })

  const both = await call('PATCH', url, { kidId: milan.id, shared: true })
  assert.equal(both.statusCode, 400)
  assert.equal(both.json().code, 'TOY_OWNER')
  assert.equal((await call('PATCH', url, {})).statusCode, 400)
  assert.equal((await call('PATCH', url, { name: '' })).statusCode, 400)
  assert.equal((await call('POST', '/family/toys', { description: 'sin nombre' })).statusCode, 400)
})

test('a toy cannot be given to a kid from another family', async () => {
  const mine = await adultWithFamily('dani@example.com')
  const theirs = await adultWithFamily('eva@example.com')
  const response = await mine.call('PATCH', `/family/toys/${mine.profile.toys[0].id}`, { kidId: theirs.profile.kids[0].id })
  assert.equal(response.statusCode, 400)
  assert.equal(response.json().code, 'UNKNOWN_KID')
})

test('saving the family form keeps what the box knows about each toy', async () => {
  const twoKids = {
    ...EXAMPLE_PROFILE,
    kids: [
      { name: 'Milán', ageMonths: 26 },
      { name: 'Sofi', ageMonths: 52 },
    ],
  }
  const { cookie, call, profile } = await adultWithFamily('fede@example.com', twoKids)
  const [dino, tren] = profile.toys
  const [milan, sofi] = profile.kids
  await call('PATCH', `/family/toys/${dino.id}`, {
    description: 'T-rex de plástico duro, unos 8 cm',
    aliases: ['el dino'],
    favorite: true,
    kidId: sofi.id,
  })
  await call('PUT', `/family/toys/${dino.id}/links`, { toys: [tren.id] })

  // The form sends each toy with its id, renamed or not. Sofi leaves the family.
  await putFamily(api, cookie, {
    kids: [{ id: milan.id, name: 'Milán', ageMonths: 26 }],
    pets: [],
    interests: [],
    toys: profile.toys.map((/** @type {Toy} */ { id, name }) => ({ id, name: id === dino.id ? 'el dino chiquito' : name })),
  })

  const box = (await call('GET', '/family/toys')).json().toys
  const kept = named(box, 'el dino chiquito')
  assert.deepEqual(
    { id: kept?.id, description: kept?.description, aliases: kept?.aliases, favorite: kept?.favorite, linked: kept?.linked },
    { id: dino.id, description: 'T-rex de plástico duro, unos 8 cm', aliases: ['el dino'], favorite: true, linked: [tren.id] },
  )
  assert.equal(kept?.kidId, null, 'a kid who leaves takes only their name off the toy')
})

test('linking makes a set, and a toy that joins another set leaves its old one', async () => {
  const { call, profile } = await adultWithFamily('gabi@example.com')
  const [a, b, c, d] = profile.toys.map((/** @type {Toy} */ toy) => toy.id)
  /** @param {string} toy @param {string[]} toys */
  const link = async (toy, toys) => {
    const response = await call('PUT', `/family/toys/${toy}/links`, { toys })
    assert.equal(response.statusCode, 200)
    return links(response.json().toys)
  }

  assert.deepEqual(await link(a, [b]), { [a]: [b], [b]: [a], [c]: [], [d]: [] })
  assert.deepEqual(await link(c, [a, b]), { [a]: [b, c].sort(), [b]: [a, c].sort(), [c]: [a, b].sort(), [d]: [] })
  assert.deepEqual(await link(d, [c]), { [a]: [b], [b]: [a], [c]: [d], [d]: [c] })
  assert.deepEqual(await link(a, []), { [a]: [], [b]: [], [c]: [d], [d]: [c] })

  // Removing a toy takes it out of its set, the box, and the profile.
  assert.equal((await call('DELETE', `/family/toys/${d}`)).statusCode, 204)
  assert.deepEqual(links((await call('GET', '/family/toys')).json().toys), { [a]: [], [b]: [], [c]: [] })
  const family = (await call('GET', '/family')).json()
  assert.ok(!family.toys.some((/** @type {Toy} */ toy) => toy.id === d))
  assert.equal((await call('DELETE', `/family/toys/${d}`)).statusCode, 404)
})

test("another family's toys are out of reach", async () => {
  const mine = await adultWithFamily('hugo@example.com')
  const theirs = await adultWithFamily('ines@example.com')
  const theirToy = theirs.profile.toys[0]

  assert.equal((await mine.call('PATCH', `/family/toys/${theirToy.id}`, { name: 'mío' })).statusCode, 404)
  assert.equal((await mine.call('DELETE', `/family/toys/${theirToy.id}`)).statusCode, 404)
  assert.equal((await mine.call('PUT', `/family/toys/${theirToy.id}/links`, { toys: [] })).statusCode, 404)
  const linked = await mine.call('PUT', `/family/toys/${mine.profile.toys[0].id}/links`, { toys: [theirToy.id] })
  assert.equal(linked.statusCode, 400)
  assert.equal(linked.json().code, 'UNKNOWN_TOY')
  assert.equal((await mine.call('PATCH', '/family/toys/no-es-un-id', { name: 'x' })).statusCode, 400)

  const box = (await theirs.call('GET', '/family/toys')).json().toys
  assert.deepEqual(
    { name: box[0].name, linked: box[0].linked },
    { name: theirToy.name, linked: [] },
  )
})

test('household materials come from a fixed list, and the family marks the ones it has', async () => {
  const { call } = await adultWithFamily('juan@example.com')
  const first = (await call('GET', '/family/materials')).json().materials
  assert.ok(first.length > 0)
  assert.ok(first.every((/** @type {{ have: boolean, label: string }} */ material) => !material.have && material.label))

  const chosen = await call('PUT', '/family/materials', { have: ['mantas', 'cajas'] })
  assert.equal(chosen.statusCode, 200)
  /** @param {{ key: string, have: boolean }[]} materials */
  const had = (materials) => materials.filter((material) => material.have).map((material) => material.key)
  assert.deepEqual(had(chosen.json().materials), ['cajas', 'mantas'])
  assert.deepEqual(had((await call('GET', '/family/materials')).json().materials), ['cajas', 'mantas'])

  assert.equal((await call('PUT', '/family/materials', { have: ['un avión'] })).statusCode, 400)
  assert.deepEqual(had((await call('PUT', '/family/materials', { have: [] })).json().materials), [])
})

test('the box holds as many toys as the family form does', async () => {
  const toys = Array.from({ length: 200 }, (_, index) => ({ name: `juguete ${index + 1}` }))
  const { call } = await adultWithFamily('kari@example.com', { ...EXAMPLE_PROFILE, toys })
  const full = await call('POST', '/family/toys', { name: 'uno más' })
  assert.equal(full.statusCode, 409)
  assert.equal(full.json().code, 'TOY_BOX_FULL')
})

test('the toy box needs a session and a family', async () => {
  assert.equal((await api.app.inject({ method: 'GET', url: '/family/toys' })).statusCode, 401)
  assert.equal((await api.app.inject({ method: 'GET', url: '/family/materials' })).statusCode, 401)

  const { cookie } = await signUpAs(api, 'lola@example.com')
  const headers = { cookie }
  assert.equal((await api.app.inject({ method: 'GET', url: '/family/toys', headers })).statusCode, 409)
  assert.equal(
    (await api.app.inject({ method: 'POST', url: '/family/toys', headers, payload: { name: 'el tren' } })).statusCode,
    409,
  )
})
