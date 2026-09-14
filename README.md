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
npm run build      # production build to web/dist (Caddy serves this)
```

### API

`api/src` is layered by domain (`accounts/`, `families/`, `activities/`, `stories/`, `health/`, `auth/`, plus `catalog/` for template slots): routes map URLs to controllers, controllers speak HTTP, and services hold the business logic and the SQL. `app.js` wires every dependency in one place, and `config.js` validates the environment at startup.

The schema lives in versioned SQL files in `api/migrations/`, applied in order and recorded in the `pgmigrations` table. `docker compose up --build` runs them in a one-shot `migrate` service after the build and before the API starts, then loads the catalog templates the database doesn't have yet (`api/seeds/catalog/`). The API only starts if both succeed, and running them again is a no-op.

```bash
npm run migration:create -w api -- add-goals  # new api/migrations/<timestamp>_add-goals.sql
npm run migrate -w api                        # apply pending migrations outside Docker
npm run seed -w api                           # the catalog plus an account for the example family (idempotent, never in production)
npm run seed:catalog -w api                   # only the catalog
docker compose up -d db && npm test -w api    # integration tests, each file on a fresh database
```

Never edit a migration that has run anywhere; add a new one.

## Status

Every 0.1 screen from the Plaza handoff (`docs/design_handoff_juguemos_plaza/`) is built in `web/` and runs on the API:

- **Accounts** through Better Auth (`/api/auth/*`, `/api/me`).
- **The family profile** (`/api/family`): kids, pets, interests, and toys, saved from the family form.
- **Activities** (`/api/activities/suggestions`) and **stories** (`/api/stories`), from templates in the database whose slots are filled with the family's own words. The first 4 activities and 6 stories are waiting for Alex's review (JUG-14).

`npm run seed -w api` adds an account for the example family (`prueba@juguemos.local` / `juguemos-local`). Signed in, `/demo` switches hard-to-reach states (offline, slow, a failed request, the two Activity layouts, night mode) and jumps to any screen by its mockup id.

Still mocked, because they need a service Juguemos doesn't have yet: Google sign-in (0.3) and email verification. Reading the family from free text and bespoke stories wait on the LLM decision (JUG-7, JUG-71), so first run starts at the family form.

Next step: Alex reviews the first templates, and the catalog grows to 30–40 activities (JUG-14).
