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

To open the stack on a phone, Caddy also serves plain HTTP on `127.0.0.1:3001`, and Tailscale Serve puts the tailnet's HTTPS in front of it (443 is taken, so it uses 8443). The phone must be on the tailnet:

```bash
tailscale serve --bg --https=8443 http://127.0.0.1:3001   # https://<machine>.<tailnet>.ts.net:8443
tailscale serve --https=8443 off                          # stop
```

`/api/health` reports database connectivity. Postgres is reachable from the dev machine on `127.0.0.1:5432`, and `docker compose exec db psql -U juguemos` opens a shell.

The client lives in `web/` as a Vite SPA in an npm workspace alongside `api/`. Both are plain JavaScript with JSDoc types:

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173 (no service worker)
npm run build      # production build to web/dist, to check it; `docker compose up --build` builds the one Caddy serves
```

### API

`api/src` is layered by domain (`accounts/`, `families/`, `activities/`, `stories/`, `health/`, `auth/`, plus `catalog/` for template slots and `admin/` for the catalog admin): routes map URLs to controllers, controllers speak HTTP, and services hold the business logic and the queries, through Drizzle ORM. `app.js` wires every dependency in one place, and `config.js` validates the environment at startup.

The schema is code, in each domain's `<domain>.schema.js`, and drizzle-kit generates the SQL migrations in `api/migrations/` from it. `docker compose up --build` applies them in a one-shot `migrate` service after the build and before the API starts, then loads the catalog templates the database doesn't have yet (`api/seeds/catalog/`). The API only starts if both succeed, and running them again is a no-op.

```bash
npm run migration:generate -w api -- --name add-goals  # after changing the schema: api/migrations/0001_add-goals.sql
npm run migrate -w api                                 # apply pending migrations outside Docker
npm run seed -w api                                    # the catalog plus the demo accounts below (idempotent, never in production)
npm run seed:catalog -w api                            # only the catalog
docker compose up -d db && npm test -w api             # integration tests, each file on a fresh database
```

Never edit a migration that has run anywhere; change the schema and generate a new one.

### Catalog admin

`/admin` manages the activity templates: add, edit, switch off, and delete. A template switched off stays out of *¡Juguemos!*, and a deleted one is gone for good, since the catalog seed never adds a deleted slug back. An edit changes the next suggestions, never the activities a family already saw.

The admin has no login yet, so the API serves it only when `.env` has `ADMIN_ENABLED=true` (then `docker compose up -d --build`). Never turn it on where anyone outside the family can reach it.

## Status

Every 0.1 screen from the Plaza handoff (`docs/design_handoff_juguemos_plaza/`) is built in `web/` and runs on the API:

- **Accounts** through Better Auth (`/api/auth/*`, `/api/me`). The app needs a valid session: it confirms it with `/api/me` and signs the device out when the API says the session has ended. Every API route except health and `/api/auth/*` needs a session too. Sessions last 30 days and renew with use.
- **The family profile** (`/api/family`): kids, pets, interests, and toys, saved from the family form. Each adult picks which kids are playing on Home (`/api/family/playing`), and juegos and stories are for those kids.
- **Activities** (`/api/activities/suggestions`) and **stories** (`/api/stories`), from templates in the database whose slots are filled with the family's own words. The first 15 activities and 6 stories are waiting for Alex's review (JUG-14).

### Demo accounts

`npm run seed -w api` loads the catalog and these accounts, each with a different family. All of them use the password `juguemos-local`.

| Email | Family |
|---|---|
| `prueba@juguemos.local` | A toddler and a pet: Milán, 2, and the dog Inca. Likes dinosaurs and horses, with four named toys |
| `bebe@juguemos.local` | A baby and no pet: Olivia, under 1. Likes songs and water, with two toys |
| `hermanos@juguemos.local` | Two kids far apart in age: Tomás, 8, and Emma, 4, and the cat Michi. Likes football, pirates, and drawing |

They exist only on a development database: the passwords are in the repo, and the seed refuses to run in production.

Still mocked, because they need a service Juguemos doesn't have yet: Google sign-in (0.3) and email verification. Reading the family from free text and bespoke stories wait on the LLM decision (JUG-7, JUG-71), so first run starts at the family form.

Next step: Alex reviews the first templates, and the catalog grows to 30–40 activities (JUG-14).
