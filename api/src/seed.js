import { activityTemplates } from '../seeds/catalog/activities.js'
import { storyTemplates } from '../seeds/catalog/stories.js'
import { accounts } from '../seeds/development.js'
import { createAuth } from './auth/auth.js'
import { createCatalogService } from './catalog/catalog.service.js'
import { loadConfig, loadDatabaseUrl } from './config.js'
import { createDb } from './db/client.js'
import { seedAccounts } from './db/seed.js'
import { createFamiliesService } from './families/families.service.js'
import { createToysService } from './toys/toys.service.js'

// `node src/seed.js catalog` loads the catalog anywhere; the `migrate` service
// runs it on every `docker compose up`. `node src/seed.js development`
// (`npm run seed -w api`) adds the development accounts too, and refuses to
// run in production: their passwords are in the repo.
const target = process.argv[2]
if (target !== 'catalog' && target !== 'development') {
  console.error('Usage: node src/seed.js catalog | development')
  process.exit(1)
}
if (target === 'development' && process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed development data: NODE_ENV is production')
  process.exit(1)
}

const db = createDb(loadDatabaseUrl())
const families = createFamiliesService({ db })

try {
  await createCatalogService({ db }).load({ activityTemplates, storyTemplates }, console.log)

  if (target === 'development') {
    const config = loadConfig()
    // The seeded emails may sign up in this process only; the API's allowlist
    // is unchanged.
    const signupEmails = new Set([...config.auth.signupEmails, ...accounts.map(({ email }) => email.toLowerCase())])
    await seedAccounts({
      auth: createAuth({ config: { ...config.auth, signupEmails }, db }),
      families,
      toys: createToysService({ db }),
      accounts,
      log: console.log,
    })
  }
} finally {
  await db.$client.end()
}
