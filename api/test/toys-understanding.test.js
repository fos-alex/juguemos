import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { EXAMPLE_PROFILE, putFamily, signUpAs, startApi } from './helpers.js'

const TEXT = 'Tiene el dinosaurio chiquito, un T-rex de plástico duro de unos 8 cm.'

/** @param {string} reply */
const fakeLlm = (reply) => ({
  async *stream() {
    yield reply
  },
})

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({
    llm: fakeLlm(JSON.stringify({ toys: [{ name: 'el dinosaurio chiquito', description: 'T-rex de plástico duro, unos 8 cm' }] })),
  })
})
after(() => api.close())

test('the endpoint returns toy candidates without saving them', async () => {
  const { cookie } = await signUpAs(api, 'ana@example.com')
  await putFamily(api, cookie, EXAMPLE_PROFILE)
  const response = await api.app.inject({
    method: 'POST',
    url: '/family/toys/understanding',
    headers: { cookie },
    payload: { text: TEXT },
  })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json().toys, [{ name: 'el dinosaurio chiquito', description: 'T-rex de plástico duro, unos 8 cm' }])
  const box = await api.app.inject({ method: 'GET', url: '/family/toys', headers: { cookie } })
  assert.equal(box.json().toys.length, EXAMPLE_PROFILE.toys.length, 'nothing saved until confirmed')
})

test('needs a family and some text', async () => {
  const { cookie } = await signUpAs(api, 'beto@example.com')
  assert.equal(
    (await api.app.inject({ method: 'POST', url: '/family/toys/understanding', headers: { cookie }, payload: { text: TEXT } }))
      .statusCode,
    409,
  )
  const { cookie: withFamily } = await signUpAs(api, 'carla@example.com')
  await putFamily(api, withFamily, EXAMPLE_PROFILE)
  assert.equal(
    (
      await api.app.inject({
        method: 'POST',
        url: '/family/toys/understanding',
        headers: { cookie: withFamily },
        payload: { text: '' },
      })
    ).statusCode,
    400,
  )
})
