# Working on the API

Rules for `api/`, on top of the repo-wide rules in the root [`AGENTS.md`](../AGENTS.md). Read both before changing anything here.

`api/` is the server: Fastify 5 on Node 24, PostgreSQL through `pg` with plain SQL and no ORM, Better Auth for accounts, and node-pg-migrate for the schema. It is plain JavaScript (ES modules) with JSDoc, and Node runs it directly with no build step.

## Commands

Run from the repo root:

```bash
docker compose up -d db && npm test -w api    # integration tests, each file on a fresh database
npm run migration:create -w api -- add-kids   # new api/migrations/<timestamp>_add-kids.sql
npm run migrate -w api                        # apply pending migrations outside Docker
npm run seed -w api                           # development data; idempotent, refuses to run in production
npm run dev -w api                            # the API outside Docker, reading ../.env
```

**The Docker image copies the source, and doesn't mount it.** After changing API code, or pulling someone else's changes, run `docker compose up -d --build`, or the stack keeps serving the old API. Every `up` runs the one-shot `migrate` service first, and the API starts only if it succeeds.

## Layout

```
src/
  server.js           starts the app: loads config, opens the pool, listens, closes cleanly
  app.js              buildApp(): wires every dependency and route, here and nowhere else
  config.js           reads and validates the environment, once, at startup
  <domain>/           one folder per domain: accounts/, families/, activities/, stories/, health/
    <domain>.routes.js      URLs, route config (`public`), and response schemas
    <domain>.controller.js  HTTP: reads the request, calls services, returns the body
    <domain>.service.js     business logic and SQL
  catalog/            template slots, filled from the family's own words
  auth/               Better Auth: the instance, its /auth/* routes, the session preHandler, the table mapping
  db/                 withTransaction, the migration runner, the seeder
  migrate.js          entry point for `npm run migrate` and the migrate service
  seed.js             entry point for `npm run seed`
migrations/           versioned plain-SQL migrations, applied in order
seeds/catalog/        the activity and story templates
seeds/development.js  the demo accounts and their families
test/                 integration tests, with helpers.js
```

## How it fits together

- **Layers.** Routes map URLs to controllers, controllers speak HTTP, and services hold the business logic and the SQL. A domain may skip a layer it doesn't need.
- **Factories with explicit dependencies.** Services are `createXService({ db })`, and controllers are `createXController({ ...services })`. Route plugins receive their controller as an option. Only `app.js` creates and passes them, so tests can build the whole app on a scratch database.
- **Configuration** is read only in `config.js`. A missing or malformed setting stops the process at startup with a message saying what to set. A new setting goes in `config.js`, in `.env.example`, and in what `docker-compose.yml` passes to the `api` service.
- **The `/api` prefix** is stripped by Caddy before the request reaches the API. Register routes without it: `/me` here is `/api/me` to the browser. `auth/auth.routes.js` puts it back for Better Auth, which routes on its full base path.
- **Every route has a response schema.** The schema is also the allowlist of what leaves the server, since fields not listed are never serialized. That is how private data stays in.
- **Errors have one shape**, `{ error }`, from `handleError` in `app.js`. Throw an error with a 4xx `statusCode` for a client's own mistake, and its message is sent back. Anything else becomes a logged 500 with the message "internal error", so internals are never described.
- **Every route needs a session by default.** A `preHandler` hook in `app.js` runs `requireSession` (`auth/session.js`) on every route: without a session it answers 401, and with one the signed-in adult is on `request.session` (`{ user, session }`). A route open to anyone sets `config: { public: true }`, as health and Better Auth's routes do. Make a route public only when it truly must be. Routes about the family also run `requireFamily` (`families/require-family.js`), which answers 409 until the adult has saved a family and puts it on `request.familyId`.
- **SQL** is parameterised (`$1`, `$2`), never built from strings. Writes that must succeed or fail together go through `withTransaction(db, async (client) => …)`.
- **Families:** each adult has one family for now, and the second parent joins in 0.6. The profile holds kids, pets, interests, and toys.
- **Templates have slots,** `{kid}`, `{pet}`, `{toy}`, `{toy2}`, `{toy3}`, and `{interest}`, filled by code in `catalog/slots.js` (no LLM in 0.1). Toys are known only by name, so write templates any toy fits, never make a word agree in gender with a slot, and never address anyone by a toy's name. "a {toy}" and "de {toy}" contract to "al" and "del" on their own. A template is offered only when the family can fill every slot it uses and its age range fits: every kid for activities, since their safety rules hold only within that range, and at least one kid for stories.

## Accounts and the guardrails

- **Better Auth** handles sign-up, sign-in, sign-out, and sessions under `/auth/*`, with email and password only for now. The session is an httpOnly cookie that lasts 30 days and is renewed with use, so a parent who opens the app once a month stays signed in.
- **Only listed emails can sign up.** `SIGNUP_EMAILS` holds the list, enforced by the `user.create.before` hook in `auth/auth.js`; empty means nobody. This is how "no outside testers until the guardrails are complete" is enforced. Never loosen it, and remind Alex of the rule whenever work touches sign-ups.
- **Better Auth's tables are ours:** they are created by migrations, with plural names and snake_case columns mapped in `auth/schema.js`. A Better Auth upgrade or plugin that needs new columns gets its own migration.

## Migrations and seeds

- **Schema changes are migrations.** Create one with `npm run migration:create -w api -- <name>` and write plain SQL with an up and a down section. Never create tables from application code, and never edit a migration that has already run anywhere; add a new one. The runner takes a lock and records what it applied, so running it twice is safe.
- **Data comes from the database, loaded by seeds,** never from application code or the web. No placeholder records or side effects that exist only to have data.
  - **Catalog templates** are in `seeds/catalog/` and load on every `docker compose up`, right after the migrations. A template already in the database is never overwritten: the database is the catalog's home (JUG-9).
  - **Demo accounts** are in `seeds/development.js`, each with a different family, and the README lists their logins. `npm run seed` loads them with the catalog, through Better Auth and the services, the way the app does, and skips whatever already exists. Their passwords are in the repo, so they never run anywhere real. Add a family setup there, and to the README's table, when exploring the app needs one.

## Tests

- **Integration tests only**, with `node:test` and `node:assert/strict`, in `test/<domain>.test.js`.
- **`startApi()`** in `test/helpers.js` creates a fresh database, applies every migration, and builds the app on it; `close()` drops it. Each file starts its own in `before` and closes it in `after`.
- **Requests go through `app.inject()`,** with no network. `cookiesFrom(response)` carries a session to the next request.
- **The tests need a Postgres** they can create databases in: `docker compose up -d db`, or set `TEST_DATABASE_URL`.
- **Cover every new endpoint,** including what it must refuse: no session, someone else's data, invalid input.

## Adding an endpoint

1. Put the SQL and logic in a service in `src/<domain>/`, and the HTTP handling in a controller beside it.
2. Add the route in `<domain>.routes.js`, with a response schema for every status that returns a body. It needs a session unless you set `config: { public: true }`.
3. Wire the service, controller, and routes in `app.js`.
4. If the schema changes, add a migration. If exploring the app needs data, add it to the seeds.
5. Write the integration tests.
6. Move the web app's function from the mock to the real endpoint, as [`web/AGENTS.md`](../web/AGENTS.md) describes.
