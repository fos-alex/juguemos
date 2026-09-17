import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createAuth } from '../src/auth/auth.js'
import { seedAccounts } from '../src/db/seed.js'
import { createFamiliesService } from '../src/families/families.service.js'
import { createInvitationsService } from '../src/invitations/invitations.service.js'
import { createMaterialsService } from '../src/materials/materials.service.js'
import { createToysService } from '../src/toys/toys.service.js'
import { accounts as demoAccounts } from '../seeds/development.js'
import { cookiesFrom, startApi } from './helpers.js'

/** @type {import('../seeds/development.js').SeedAccount[]} */
const accounts = [
  {
    name: 'Prueba',
    email: 'prueba@example.com',
    password: 'una-clave-larga',
    family: {
      name: 'Familia de prueba',
      kids: [{ name: 'Milán', ageMonths: 26 }],
      pets: [],
      interests: [],
      toys: [{ name: 'el tren grandote' }],
    },
  },
  { name: 'Sola', email: 'sola@example.com', password: 'una-clave-larga' },
]

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({ signupEmails: accounts.map(({ email }) => email) })
})
after(() => api.close())

/** The invitations the seed's auth checks sign-ups against, with no mailer. @param {typeof api} target */
const invitationsFor = (target) => createInvitationsService({ db: target.db, mailer: null, appUrl: target.config.auth.url })

const runSeed = () =>
  seedAccounts({
    auth: createAuth({ config: api.config.auth, db: api.db, invitations: invitationsFor(api) }),
    families: createFamiliesService({ db: api.db }),
    toys: createToysService({ db: api.db }),
    materials: createMaterialsService({ db: api.db }),
    accounts,
  })

test('seeding twice creates each account and family once', async () => {
  await runSeed()
  await runSeed()

  const { rows } = await api.pool.query(
    `select u.email, f.name as family, (select count(*)::int from kids k where k.family_id = f.id) as kids
     from users u
     left join family_members m on m.user_id = u.id
     left join families f on f.id = m.family_id
     order by u.email`,
  )
  assert.deepEqual(rows, [
    { email: 'prueba@example.com', family: 'Familia de prueba', kids: 1 },
    { email: 'sola@example.com', family: null, kids: 0 },
  ])
})

test('a seeded account signs in and finds its family', async () => {
  await runSeed()
  const response = await api.app.inject({
    method: 'POST',
    url: '/auth/sign-in/email',
    payload: { email: 'prueba@example.com', password: 'una-clave-larga' },
  })
  assert.equal(response.statusCode, 200)

  const family = await api.app.inject({ method: 'GET', url: '/family', headers: { cookie: cookiesFrom(response) } })
  assert.equal(family.json().name, 'Familia de prueba')
  assert.deepEqual(
    family.json().toys.map((toy) => toy.name),
    ['el tren grandote'],
  )
})

test('each demo account signs in and finds its own family, exactly as seeded', async () => {
  const demo = await startApi({ signupEmails: demoAccounts.map(({ email }) => email) })
  try {
    await seedAccounts({
      auth: createAuth({ config: demo.config.auth, db: demo.db, invitations: invitationsFor(demo) }),
      families: createFamiliesService({ db: demo.db }),
      toys: createToysService({ db: demo.db }),
      materials: createMaterialsService({ db: demo.db }),
      accounts: demoAccounts,
    })
    for (const { email, password, family, toyBox, materials = {} } of demoAccounts) {
      const signedIn = await demo.app.inject({ method: 'POST', url: '/auth/sign-in/email', payload: { email, password } })
      assert.equal(signedIn.statusCode, 200, email)
      const cookie = cookiesFrom(signedIn)

      const box = (await demo.app.inject({ method: 'GET', url: '/family/toys', headers: { cookie } })).json().toys
      for (const [name, { description = null, favorite = false }] of Object.entries(toyBox?.details ?? {})) {
        const toy = box.find((/** @type {{ name: string }} */ candidate) => candidate.name === name)
        assert.deepEqual({ description: toy?.description, favorite: toy?.favorite }, { description, favorite }, `${email}: ${name}`)
      }

      const { categories } = (await demo.app.inject({ method: 'GET', url: '/family/materials', headers: { cookie } })).json()
      const marked = categories.flatMap((/** @type {{ materials: { key: string, have: boolean }[] }} */ category) => category.materials)
      for (const [key, have] of Object.entries(materials)) {
        assert.equal(marked.find((/** @type {{ key: string }} */ material) => material.key === key)?.have, have, `${email}: ${key}`)
      }

      const profile = (await demo.app.inject({ method: 'GET', url: '/family', headers: { cookie } })).json()
      assert.equal(profile.name, family?.name, email)
      assert.deepEqual(
        profile.kids.map(({ name, ageMonths, interests }) => ({ name, ageMonths, interests })),
        family?.kids,
        email,
      )
      assert.deepEqual(profile.pets.map(({ name, kind }) => ({ name, kind })), family?.pets, email)
      assert.deepEqual(profile.parents.map(({ name, calledAs }) => ({ name, calledAs })), family?.parents ?? [], email)
      assert.equal(profile.home, family?.home ?? null, email)
      assert.deepEqual(profile.toys.map(({ name }) => ({ name })), family?.toys, email)
    }
  } finally {
    await demo.close()
  }
})
