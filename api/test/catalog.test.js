import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { activityTemplates } from '../seeds/catalog/activities.js'
import { storyTemplates } from '../seeds/catalog/stories.js'
import { accounts } from '../seeds/development.js'
import { createActivitiesService } from '../src/activities/activities.service.js'
import { fillFor, render, seededRandom, unknownPlaceholders } from '../src/catalog/slots.js'
import { seedCatalog } from '../src/db/seed.js'
import { createFamiliesService } from '../src/families/families.service.js'
import { createStoriesService } from '../src/stories/stories.service.js'
import { putFamily, signUpAs, startApi } from './helpers.js'

const [developer] = accounts
const family = /** @type {NonNullable<typeof developer.family>} */ (developer.family)
// The development family as the slots see it.
const profile = {
  id: 'development',
  name: family.name ?? null,
  kids: family.kids.map((kid, index) => ({ id: `k${index}`, name: kid.name, age: kid.age })),
  pets: family.pets.map((pet, index) => ({ id: `p${index}`, name: pet.name })),
  interests: family.interests,
  toys: family.toys.map((toy, index) => ({ id: `t${index}`, name: toy.name })),
}

const CONTRACTIBLE = /(?<!\p{L})(de|a) el(?!\p{L})/iu

test('every catalog template fills cleanly for the development family', () => {
  const templates = [
    ...activityTemplates.map((t) => ({
      slug: t.slug,
      range: t,
      texts: [t.title, t.why, t.needs, ...t.steps, t.easier, t.harder],
    })),
    ...storyTemplates.map((t) => ({ slug: t.slug, range: t, texts: [t.title, t.teaser, ...t.parts.flat()] })),
  ]
  for (const { slug, range, texts } of templates) {
    assert.deepEqual(unknownPlaceholders(texts), [], slug)
    const fill = fillFor(profile, { ...range, texts }, seededRandom(slug))
    assert.ok(fill, `${slug} fits the development family`)
    for (const text of texts) {
      const rendered = render(text, fill)
      assert.doesNotMatch(rendered, /[{}]/, slug)
      assert.doesNotMatch(rendered, CONTRACTIBLE, slug)
    }
  }
})

/** @type {Awaited<ReturnType<typeof startApi>>} */
let api
before(async () => {
  api = await startApi({ signupEmails: [developer.email] })
})
after(() => api.close())

const services = () => {
  const families = createFamiliesService({ db: api.db })
  return {
    activities: createActivitiesService({ db: api.db, families }),
    stories: createStoriesService({ db: api.db, families }),
  }
}

test('seeding the catalog twice adds each template once', async () => {
  const catalog = { activityTemplates, storyTemplates }
  await seedCatalog({ ...services(), catalog })
  await seedCatalog({ ...services(), catalog })

  const { rows } = await api.pool.query(
    `select (select count(*)::int from activity_templates) as activities, (select count(*)::int from story_templates) as stories`,
  )
  assert.deepEqual(rows[0], { activities: activityTemplates.length, stories: storyTemplates.length })
})

test('with the catalog loaded, the development family gets activities and stories', async () => {
  await seedCatalog({ ...services(), catalog: { activityTemplates, storyTemplates } })
  const { cookie } = await signUpAs(api, developer.email)
  assert.equal((await putFamily(api, cookie, family)).statusCode, 200)

  const activity = await api.app.inject({ method: 'POST', url: '/activities/suggestions', headers: { cookie }, payload: {} })
  assert.equal(activity.statusCode, 201)
  const options = await api.app.inject({ method: 'GET', url: '/stories/options', headers: { cookie } })
  assert.equal(options.json().length, 3)
})
