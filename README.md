# Juguemos

*The play coach that knows your family by heart.*

Juguemos helps families turn the time they have into play that is fun and meaningful. It knows who is in the family, what each kid loves, which toys are in the house, and what each child is working on learning, and it uses all of that to answer one everyday question: *¿Qué hacemos ahora?*

**Version 1 scope:** Argentina (Buenos Aires first) · ages 1–5 · responsive web

**Stack:** React SPA (Vite) · Fastify · PostgreSQL · Docker Compose on a DigitalOcean droplet

## Documentation

| Document | What it covers |
|---|---|
| [Product concept](docs/product-concept.md) | Vision, market, features, content, and the v1 decisions |
| [Constitution](docs/constitution.md) | The five commitments and the guardrails every decision follows |
| [Architecture](docs/architecture.md) | The technical decisions and why they were made |
| [Design](docs/design.md) | How the app looks, and the rules behind it |
| [Releases](docs/releases.md) | The plan from the 0.1 concept test to the 1.0 launch |
| [AGENTS.md](AGENTS.md) | How agents work in this repo, with a guide each for [web/](web/AGENTS.md) and [api/](api/AGENTS.md) |

## Running it

The stack runs at `https://juguemos.local:3000`, the same shape as production: one origin, Caddy in front, `/api` proxied to the API container.

```bash
docker compose up --build
```

`docker compose up` applies pending migrations and loads new catalog templates before the API starts, so a pull needs nothing else. Rebuild (`--build`) only after a dependency changes in `package.json`. `/api/health` reports database connectivity, and `docker compose exec db psql -U juguemos` opens a database shell.

Hot reload is on by default: `.env.example` sets `COMPOSE_FILE=docker-compose.yml:compose.dev.yml`, which mounts `web/` and `api/src` into the containers, so a saved change shows up without a rebuild. The droplet's `.env` leaves `COMPOSE_FILE` out and builds the production web app instead. There is no service worker in development; a browser that installed the production one gets a script that removes it.

### First-time setup

```bash
sudo usermod -aG docker $USER
echo '127.0.0.1 juguemos.local' | sudo tee -a /etc/hosts

# Arch/Omarchy shadow .local hosts entries behind mDNS; this puts /etc/hosts first
sudo sed -i 's/^hosts:.*/hosts: files mymachines mdns_minimal [NOTFOUND=return] resolve myhostname dns/' /etc/nsswitch.conf

# A session secret, and the emails allowed to sign up (comma-separated)
cp .env.example .env
sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|; s|^SIGNUP_EMAILS=.*|SIGNUP_EMAILS=you@example.com|" .env

docker compose up --build

# Trust Caddy's local certificate authority (Arch; Firefox imports it separately)
docker compose exec caddy cat /data/caddy/pki/authorities/local/root.pem | sudo tee /etc/ca-certificates/trust-source/anchors/juguemos-local.pem
sudo update-ca-trust
```

Voice notes run Whisper as the `stt` service. Its first start downloads about 1.6 GB into a volume, and voice notes fail until that finishes.

### On a phone

Caddy also serves plain HTTP on `127.0.0.1:3001`, and Tailscale Serve puts the tailnet's HTTPS in front of it (443 is taken, so it uses 8443). The phone has to be on the tailnet.

```bash
tailscale serve --bg --https=8443 http://127.0.0.1:3001   # https://<machine>.<tailnet>.ts.net:8443
tailscale serve --https=8443 off                          # stop
```

Add that address to `TRUSTED_ORIGINS` in `.env` and run `docker compose up -d`, or signing in from the phone fails with "Invalid origin".

### Demo accounts

`npm run seed -w api` loads the catalog and these accounts, each with a different family. All of them use the password `juguemos-local`. They exist only on a development database: the passwords are in the repo, and the seed refuses to run in production.

| Email | Family |
|---|---|
| `prueba@juguemos.local` | A toddler and a pet: Milán, 2 years and 2 months, and the dog Inca. Likes dinosaurs and horses, with five named toys |
| `bebe@juguemos.local` | A baby and no pet: Olivia, 8 months. Likes songs and water, with two toys |
| `hermanos@juguemos.local` | Two kids far apart in age: Tomás, 8 years and 2 months, and Emma, 4 years and 4 months, and the cat Michi |

### Catalog admin

`/admin` manages the activity templates: add, edit, switch off, and delete. It has no login yet, so the API serves it only when `.env` has `ADMIN_ENABLED=true`. Never turn it on where anyone outside the family can reach it.

## Nightly cleanup

`scripts/nightly-cleanup.sh` runs at 03:00 through the `juguemos-nightly` systemd user timer. It removes worktrees whose PR has been merged or closed, along with their branches, and moves Linear issues whose work has landed to Done. It leaves alone anything with uncommitted or unpushed work, and reports it instead.

```bash
cat ~/.local/state/juguemos/nightly.log          # what it did; LEFT FOR ALEX marks what needs you
./scripts/nightly-cleanup.sh --dry-run --stdout  # what it would do right now
```

To install it, copy `scripts/juguemos-nightly.service` and `scripts/juguemos-nightly.timer` into `~/.config/systemd/user/`, then `systemctl --user daemon-reload && systemctl --user enable --now juguemos-nightly.timer`. The Linear half shells out to Claude Code with Haiku, since the Linear MCP signs in with OAuth and the script has no key of its own.

## Status

Every 0.1 screen is built and runs on the API: accounts with a required session, the family profile, the toy box, activities and stories from templates in the database, and voice notes on *Contame de tu familia*. Reading the family from the parent's own words and bespoke stories use the LLM set in `.env`; without a key, first run starts at the family form and stories come from templates.

Still missing, because they need services Juguemos doesn't have yet: Google sign-in (0.3) and email verification.

Next: Alex reviews the first templates, and the catalog grows to 30–40 activities (JUG-14).
