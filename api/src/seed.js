import pg from 'pg'
import { accounts } from '../seeds/development.js'
import { createAuth } from './auth/auth.js'
import { loadConfig } from './config.js'
import { seed } from './db/seed.js'
import { createFamiliesService } from './families/families.service.js'

// Run by `npm run seed -w api`. Development data only: the seeded accounts
// have known passwords.
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed: NODE_ENV is production')
  process.exit(1)
}

const config = loadConfig()
const db = new pg.Pool({ connectionString: config.databaseUrl })

// The seeded emails may sign up in this process only; the API's allowlist
// is unchanged.
const signupEmails = new Set([...config.auth.signupEmails, ...accounts.map(({ email }) => email.toLowerCase())])

try {
  await seed({
    auth: createAuth({ config: { ...config.auth, signupEmails }, db }),
    families: createFamiliesService({ db }),
    accounts,
    log: console.log,
  })
} finally {
  await db.end()
}
