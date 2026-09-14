# Juguemos

*The play coach that knows your family by heart.*

Juguemos helps families turn the time they have into play that is fun and meaningful. It knows who is in the family, what each kid loves, which toys are in the house, the weather outside, and what each child is working on learning, and it uses all of that to answer one everyday question: *¿Qué hacemos ahora?*

**Version 1 scope:** Argentina (Buenos Aires first) · ages 1–5 · responsive web

**Stack:** React SPA (Vite) · Fastify · PostgreSQL · Docker Compose on a DigitalOcean droplet

## Documentation

| Document | What it covers |
|---|---|
| [Product concept](docs/product-concept.md) | Vision, market landscape, features, content approach, v1 decisions, and the planning roadmap |
| [Constitution](docs/constitution.md) | The five commitments, guardrails, and how to resolve conflicts between them |
| [Architecture](docs/architecture.md) | How Juguemos is built and run: stack, hosting, data, and operations |
| [Releases](docs/releases.md) | The release plan from the 0.1 concept test to the 1.0 launch, and the question each release answers |

## Development

The stack runs locally at `https://juguemos.local:3000`, mirroring production: one origin, Caddy in front, `/api` proxied to the API container. One-time setup:

```bash
sudo usermod -aG docker $USER
echo '127.0.0.1 juguemos.local' | sudo tee -a /etc/hosts

# Arch/Omarchy shadow .local hosts entries behind mDNS; this puts /etc/hosts first
sudo sed -i 's/^hosts:.*/hosts: files mymachines mdns_minimal [NOTFOUND=return] resolve myhostname dns/' /etc/nsswitch.conf

# Local settings: a session secret, and the emails allowed to sign up (comma-separated)
cp .env.example .env
sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|; s|^SIGNUP_EMAILS=.*|SIGNUP_EMAILS=you@example.com|" .env

docker compose up --build

# Trust Caddy's local certificate authority (Arch Linux; Firefox imports it separately if needed)
docker compose exec caddy cat /data/caddy/pki/authorities/local/root.pem | sudo tee /etc/ca-certificates/trust-source/anchors/juguemos-local.pem
sudo update-ca-trust
```

`/api/health` reports database connectivity. Postgres is reachable from the dev machine on `127.0.0.1:5432`, and `docker compose exec db psql -U juguemos` opens a shell.

The client lives in `web/` as a Vite SPA in an npm workspace alongside `api/`. Both are plain JavaScript with JSDoc types:

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173 (no service worker)
npm run build      # production build to web/dist (Caddy serves this)
```

### API

`api/src` is layered by domain (`accounts/`, `families/`, `health/`, `auth/`): routes map URLs to controllers, controllers speak HTTP, and services hold the business logic and the SQL. `app.js` wires every dependency in one place, and `config.js` validates the environment at startup.

The schema lives in versioned SQL files in `api/migrations/`, applied in order and recorded in the `pgmigrations` table. `docker compose up --build` runs them in a one-shot `migrate` service after the build and before the API starts; the API only starts if they succeed, and running them again is a no-op.

```bash
npm run migration:create -w api -- add-kids   # new api/migrations/<timestamp>_add-kids.sql
npm run migrate -w api                        # apply pending migrations outside Docker
npm run seed -w api                           # load development data from api/seeds (idempotent, never in production)
docker compose up -d db && npm test -w api    # integration tests, each file on a fresh database
```

Never edit a migration that has run anywhere; add a new one.

## Status

Every 0.1 screen from the Plaza handoff (`docs/design_handoff_juguemos_plaza/`) is built in `web/` and runs on mocked data from `web/src/api/mock.js`. Open `/demo` to switch hard-to-reach states (the AI misreading the family, offline, slow, a failed request, the two Activity layouts, dark mode) and to jump to any screen by its mockup id.

Accounts are real: creating an account, signing in, and signing out go through Better Auth in the API (`/api/auth/*`). `/api/me` returns the signed-in user and their family, if they have one. `npm run seed -w api` adds a local account with a family (`prueba@juguemos.local` / `juguemos-local`). Email verification and Google sign-in are still mocked, and the family's details still live only on the device.

Next step: design the data model, meaning the core entities (family, household, adults and their play styles, kids, toys, special dates) and the tags every activity, toy, goal, and tip carries.
