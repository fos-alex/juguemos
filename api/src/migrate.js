import { loadDatabaseUrl } from './config.js'
import { migrate } from './db/migrate.js'

// Run by the `migrate` service before the API starts (docker-compose.yml), and
// by `npm run migrate -w api`. A failure exits non-zero, so the API never
// starts on a schema it doesn't expect.
const applied = await migrate({ databaseUrl: loadDatabaseUrl(), log: console.log })
console.log(applied.length > 0 ? `Applied ${applied.join(', ')}` : 'Database is up to date')
