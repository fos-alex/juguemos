# Juguemos — Architecture

**Version:** 0.7 · September 2026 · Owner: Alex Otero

*A living document. Decisions here are revisited as the product takes shape, and each release may change it.*

---

## 1. Scope

This document covers how Juguemos is built and run. The product itself is described in [product-concept.md](product-concept.md), and the principles behind the decisions are in [constitution.md](constitution.md).

Version 1 targets Argentina, ages 1–5, on responsive web.

## 2. Decisions so far

| Area | Decision | Status |
|---|---|---|
| Client | React SPA built with Vite (JavaScript with JSDoc, TanStack Router), shipped as static files served by Caddy | Decided |
| Devices | Mobile-first: mid-range Android and iPhone, Chrome and Safari. Desktop is not a target | Decided |
| Offline | Service worker for the app shell; an app-owned store for offline data | Decided |
| Server | Node.js HTTP API (Fastify), long-running | Decided |
| Database | PostgreSQL. If content grows heavy, a CMS with its own database joins later | Decided |
| Database access | Drizzle ORM in plain JavaScript: the schema is code, drizzle-kit generates the SQL migrations from it, and Better Auth uses its Drizzle adapter (JUG-105) | Decided |
| Hosting | Existing DigitalOcean droplet | Decided |
| Local development | Docker Compose, same as production, at `https://juguemos.local` | Decided |
| TLS and reverse proxy | Caddy: automatic certificates in production, internal CA locally | Decided |
| Language | JavaScript with JSDoc across client and server. JSDoc guides agents and readers and is not typechecked; TypeScript was tried and dropped, and its packages removed (JUG-70). Node 24 can still run `.ts` natively if a module ever wants it | Decided |
| Repo layout | Single repo. npm workspaces (api, web): one install, separate codebases, no shared package; no heavier tooling | Decided |
| Native mobile apps | Not in v1. After 1.0: native Android/iOS or React Native, TBD | Decided |
| Authentication | Better Auth in the API: email and password, sessions in PostgreSQL behind an httpOnly cookie. Sign-up limited to an email allowlist until invitations (0.5); Google sign-in (0.3) is a plugin on the same library | Decided |

## 3. Hosting: why the droplet

Version 1 runs on the DigitalOcean droplet that already exists. Vercel's free Hobby plan was considered and rejected for three reasons.

**The Hobby plan is non-commercial only.** Vercel's fair use guidelines restrict Hobby teams to personal, non-commercial use and require Pro or Enterprise for commercial usage, defined broadly as any deployment used for the financial gain of anyone involved in producing it. Juguemos is intended to be a real product, so that foundation would have to be abandoned as soon as it earned anything.

**Content on Hobby may be used for model training.** Vercel's terms, updated June 1 2026, allow this with an opt-out in team settings, while paid Pro does not enable it by default. For an app holding children's names, ages, photos, and voice notes, that is the wrong default to start from and conflicts with the constitution's privacy guardrail.

**The architecture fits a server better than serverless.** Juguemos is a React front end with a separate Node API, not a Next.js app. Several operations are slow by nature: voice transcription, activity tailoring, and story generation. Serverless function timeouts are a real constraint there, and reported Hobby ceilings vary enough between sources to make them an unreliable thing to build on. A long-running server has no such limit, and the database sits next to the application instead of on another provider's free tier.

The trade-off is accepted: backups, updates, and uptime are managed by the team. For a pre-launch product with a handful of test families, that is a fair price for zero marginal cost and no licensing problem. If operations become a distraction, DigitalOcean's App Platform and managed Postgres are a much shorter move than leaving Vercel would have been.

## 4. System shape

Three containers on one droplet, defined in a single Docker Compose file used in both local development and production.

| Container | Role |
|---|---|
| **caddy** | Reverse proxy and TLS. Serves the built React app as static files and proxies `/api` to the server. Certificates are obtained and renewed automatically. |
| **api** | Node.js HTTP server. Owns all business logic, database access, and every call to external services. |
| **db** | PostgreSQL, with data on a mounted volume. |

Key rules:

- The browser never talks to an LLM provider, a maps provider, or the database directly. Everything goes through the API, so that keys stay on the server and every AI call can be logged, rate-limited, and bounded by safety rules.
- The database is not exposed to the public internet. Only the API container reaches it.
- The same Compose file runs locally, so there is no drift between a developer machine and the server.
- Caddy serves the app with `immutable` long-caching for hashed assets and `no-cache` for everything else, which is what makes every deploy refresh cleanly on clients.
- Locally, the same stack serves `https://juguemos.local` with a certificate from Caddy's internal CA. On the droplet, the same Caddyfile swaps the site address for the real domain.
- The scaffold is in the repo: `docker-compose.yml`, `caddy/Caddyfile`, `api/` (a Fastify server whose health route verifies database connectivity), and `web/` (the React SPA, whose Vite build output Caddy serves from `web/dist`). The repo is an npm workspace: `api` and `web`, sharing one install with separate codebases.

## 5. Client

A single-page app built with Vite and React, written in JavaScript with JSDoc types on the domain data, shipped as static files that Caddy serves. TanStack Router gives it per-route code splitting and prefetching on tap, so every screen after the first loads instantly. No heavy UI component library; the bundle stays lean. The server runs Node 24, which runs `.js` directly; TypeScript was tried across the stack for shared contract types and dropped when the shared package proved only theoretical.

Next.js was considered and set aside. Juguemos is a logged-in, phone-first app with no public pages to rank, and every piece of data and logic belongs to the API. Server-side rendering would add a second server runtime next to it and buy nothing, while its hydration cost would land squarely on the mid-range phones that matter most. If marketing pages that need SEO ever appear, they can be a tiny separate site.

### 5.1 Devices and browsers

The interface is phone-first and one-handed, since a parent is often holding a toddler: large text, generous tap targets, and a reading screen for Story Time that keeps the screen awake and switches to a warm dark mode near bedtime. Mobile is not a layout variant; it is the product.

- **Target devices: mid-range Android phones and recent iPhones.** A mid-range Android is the floor for every performance decision, not a fallback. The budget: first screen interactive in under three seconds on a throttled mid-range device (4× CPU slowdown, slow 4G), with under ~150 KB gzipped of JavaScript for the initial route.
- **Target browsers: Chrome on Android and Safari on iOS.** Two engines, both first-class. iOS Safari is the riskiest target and gets real-device testing early, especially for microphone capture, service workers, and keeping the screen awake.
- **Desktop is not a target.** The app must not break in a desktop browser, but it gets no dedicated layouts, features, or testing effort in v1.

Voice is the primary input, captured in the browser and sent to the API for transcription. Browser support and permissions for microphone capture need to be validated early on a real iPhone, which is the riskiest target.

### 5.2 Offline and the service worker

Play happens in plazas and bedrooms with weak signal, so the app keeps working when the connection is poor: current suggestions, active goals, and the last story a parent opened remain readable offline. Two hard rules govern the how, born of experience with service worker pain:

**The service worker does not exist in development.** The precache is generated only by `vite build` (Workbox via `vite-plugin-pwa`) and registered only in production builds. `vite dev` serves no worker at all, so it can never cache the dev server or leave stale caches on a developer machine. Service worker behavior is tested the honest way: a production build served locally.

**Every deploy refreshes cleanly on every client.** The known failure modes, each closed:

- Assets are content-hashed. Each build produces new filenames and a new precache manifest; the new worker diffs the manifests, downloads the new files, and deletes the old caches.
- Entry points always revalidate. Caddy sends `no-cache` for `index.html` and the service worker file and `immutable` for hashed assets — already the case in the scaffold's Caddyfile. If any HTTP cache can serve a stale worker, the whole system breaks silently; this is the rule that most often goes wrong.
- Open tabs survive a deploy. A tab running yesterday's code may request a lazy chunk the new deploy replaced; the chunk-load error is caught and turned into a single page reload, which lands on the new version instead of a broken screen.
- Updates never interrupt. New versions download in the background, checked on load and on returning to the app; when one is ready, a small banner offers a refresh. A parent mid-story is never force-reloaded.
- **Offline data is not the service worker's job.** The worker precaches the app shell so the app opens offline. Product data — current suggestions, active goals, the last story opened — lives in a small app-owned store (IndexedDB) written on every successful fetch and read when the network fails. The worker never caches API responses: that is the origin of most stale-data horror stories, and the app knows better than the worker what may be served stale.
- **A kill switch always exists.** If a bad worker ever ships, the next deploy can ship one that unregisters all previous workers and tears down their caches.

### 5.3 Local development: juguemos.local

Local development runs at `https://juguemos.local`, not `localhost:3000`, for three reasons:

- Microphone capture, service workers, and the other browser APIs the app leans on require a secure context.
- Development matches production's shape: one origin, Caddy in front, `/api` proxied to the API container, same Compose file.
- A real hostname lets real phones on the same Wi-Fi load the dev server, which matters because iOS Safari must be tested on hardware early.

The dev machine resolves `juguemos.local` through its hosts file (on Arch, `files` must come before `mdns_minimal` in `/etc/nsswitch.conf`, or the entry is shadowed); Caddy issues a certificate from its internal CA locally, and the root is trusted once per device. Phones on the network can resolve the name over mDNS, which is exactly what `.local` is for. In production, the same Caddyfile swaps the site address for the real domain and obtains certificates automatically; everything else is identical.

### 5.4 After version 1: native

After 1.0, Juguemos goes native: Android and iOS apps, either React Native or fully native, to be decided then. This is decided now because it shapes v1:

- The client stays a thin rendering layer. All business logic, data, and AI orchestration live in the API, so a native client is a port of the same API, not a rebuild of the product.
- Browser-specific investment stops at what v1 needs: offline through a service worker, not deep PWA installability.
- What a native client would reuse — voice capture, the offline store, the API client — is written as isolated modules, not woven through components.

## 6. Server

A Node.js HTTP API (Fastify), organized around the product's domains: family and household, toy box, activities and play, goals, tips, stories, special days, and moments.

Responsibilities that belong to the server and nowhere else:

- All database access.
- All AI calls, including activity tailoring and story generation, with the safety constraints of each activity template enforced server-side.
- Voice transcription, after which the audio is discarded rather than stored.
- Calls to the weather and maps providers, with responses cached so the same neighborhood is not queried repeatedly.
- The holiday calendar, maintained per country and per year, starting with Argentina.

The code is layered by domain. Routes map URLs to controllers, controllers handle HTTP (parsing, status codes, and response schemas that also decide which fields leave the server), and services hold the business logic and the queries. `app.js` builds the app with every dependency passed in, which is what lets the integration tests build it against a scratch database. Configuration is read and validated once at startup, and a missing secret stops the process. One error handler gives every failure the same shape and never describes server errors to the client.

Long-running AI work is the main performance concern. Story generation should stream to the client where possible, so the parent sees text appear rather than waiting on a blank screen.

## 7. Data

PostgreSQL, chosen because the model is genuinely relational: families, households, adults and their play styles, kids, toys, activity templates, goals, tips, stories, and moments, with links between nearly all of them. The core query of the product, finding activities for a given age, duration, energy level, and location that use toys this family owns, is exactly what SQL handles well.

Postgres also offers two things worth having later: JSONB for the flexible parts, such as activity templates and their tailoring slots, and `pgvector` if semantic matching over the activity and story catalog proves useful.

**If content grows heavy, a CMS with its own database joins later.** The product side of the catalog — drafts, review states, versions, reviewer accounts, the whole content factory described in the release plan's 0.7 — may one day be more than the app database wants to hold. The answer when we get there is not to stretch PostgreSQL further, but to stand up a CMS with its own database that publishes finished, reviewed content to the app. The v1 schema only needs to keep published content cleanly separated from family data, so that split, if it ever comes, is cheap.

**Accounts.** Better Auth uses `users`, `sessions`, `accounts`, and `verifications`; `families` and `family_members` link each adult to one family. Signing up creates only the account; a family is created explicitly, never as a side effect. Every table uses plural names and snake_case columns, Better Auth's included (defined in `api/src/auth/auth.schema.js`).

**The family profile** is `kids`, `pets`, `interests`, and `toys`, each kept in the parent's order and with names exactly as typed. A kid's age is stored as the years the parent gave and the day they gave it, so it stays current without asking for a birthday. Saving the profile updates rows by id, so ids stay stable for what will reference them later.

**The catalog lives in the database** (JUG-9): `activity_templates`, tagged with the full taxonomy (age range in months, minutes, place, energy, categories, small space, materials, skills, and safety), and `story_templates`. Templates have slots (`{kid}`, `{pet}`, `{toy}`, `{toy2}`, `{toy3}`, `{interest}`) that code fills from the profile (`api/src/catalog/slots.js`); there is no LLM in 0.1. A template is offered only when the family can fill every slot it uses and its age range fits: every kid for activities, since their safety rules hold only within that range, and at least one kid for stories.

**The catalog admin** (JUG-109) is how a loaded template is revised before 0.7's content backend: a page at `/admin` that adds, edits, switches off, and deletes activity templates. A template switched off stays out of the suggestions. Deleting one marks its row `deleted_at` instead of removing it, so the catalog seed, which skips slugs already in the database, never brings it back. The admin has no login yet, so the API serves it only when `ADMIN_ENABLED` is true, and it's never turned on where anyone outside the family can reach it. 0.7 still brings review states, versions, and reviewer accounts.

**What a family was given is saved as they saw it.** `activities` holds each suggestion as it was tailored, and `stories` each story as it was written, so a story reads again exactly the same. Stories written by an LLM (JUG-71) will be saved to `stories` too, marked by `source`.

**Seeds.** Data never comes from application code; seeds load it through Better Auth and the services, the same way the app does, and skip whatever already exists. The catalog seed (`api/seeds/catalog/`) runs on every `docker compose up`, right after the migrations, and never overwrites a template already in the database, since the database is the catalog's home. The development seed (`api/seeds/development.js`, an account for the example family) refuses to run in production.

**Database access.** The API reaches Postgres through Drizzle ORM (JUG-105). The schema is defined once, in code, next to the code that uses it: each domain's tables are in its `<domain>.schema.js`, beside its service. The queries and migrations follow from it. Drizzle was chosen because it stays close to SQL: the schema expresses the check constraints and partial indexes the model relies on, raw SQL remains available for what's Postgres-specific, and it needs neither TypeScript nor a code generator. Prisma would have kept check constraints out of its schema, and the class-based ORMs only pay off with TypeScript.

**Migrations.** The schema is only ever changed by SQL migrations in `api/migrations/`, which drizzle-kit generates from the schema locally. Only the `.sql` files are committed: drizzle-kit's snapshots in `migrations/meta/` stay out of the repo (JUG-71). A small runner of our own (`api/src/db/migrate.js`) applies the pending files in name order, each in its own transaction, and records each one's name and hash in `juguemos_migrations`. It holds an advisory lock, so concurrent runs wait their turn and applying is idempotent. It refuses a migration edited after it ran, and one older than the latest applied, which would otherwise never run. On a database that Drizzle's migrator ran on, its first run copies Drizzle's records from `drizzle.__drizzle_migrations`, matched to the files by the same SHA-256, so no migration runs twice. A one-shot `migrate` service runs them on every `docker compose up`, after the image builds and before the API starts, and the API only starts if they succeed. They can't run inside `docker build` itself, because the database isn't reachable there. Application code never creates tables, a migration that has run anywhere is never edited, and migrations only go forward.

The rest of the schema (goals, tips, moments, special days, toy descriptions) arrives with the releases that need it. The tags on activities, toys, goals, and tips stay the backbone of the product, since they determine what the app can actually do.

Two data rules carry over from the constitution and shape the schema:

- A toy's family name and its description for the AI are stored as separate fields, and the AI never derives facts, especially about size or safety, from the family name.
- Each activity template has a reviewed core that the AI cannot alter, and tailoring slots that it fills per family.

## 8. External services

| Service | Used for | Notes |
|---|---|---|
| LLM provider | Activity tailoring, story generation, onboarding extraction, agent conversation | Provider not yet chosen. Calls are server-side only. |
| Speech-to-text | Voice onboarding and voice input | Must handle Rioplatense Spanish, children's names, and background noise. Audio is discarded after transcription. |
| Weather | Matching suggestions to conditions | Cached per location. |
| Maps | Nearby plazas, parks, and kid-friendly places | Maps data is considered sufficient for v1; no curated event listings. |

Each of these should sit behind a thin internal interface, so a provider can be swapped without touching product code.

## 9. Privacy and security

These follow directly from the constitution's guardrails.

Family data is minimal by default, and children's names, ages, photos, and location get the highest level of care. Voice recordings are transcribed and then discarded. Parents can see, change, and delete everything the app knows about their family. Nothing is sold or shared, and no data is used to advertise to children.

Practical consequences for the architecture:

- All secrets live in server-side environment variables, never in the client bundle.
- Photos are stored on the droplet's volume, not on a third-party service, and are served only to the family that owns them.
- Backups are encrypted and stored off the droplet.
- Argentina's Ley 25.326, overseen by the AAIP, is the first legal framework to satisfy. Each new market adds its own.

## 10. Operations

Deployment is a rebuild and restart of the Compose stack on the droplet, kept simple enough to run from a single command.

The minimum operational needs for v1 are: automated nightly database backups stored off the droplet and verified by restoring them at least once, basic uptime and error monitoring, and application logs that record AI calls for cost and debugging without storing the contents of family data unnecessarily.

Version 1 runs a single environment. A separate staging environment is worth adding once real families outside the founder's household are using it.

## 11. Open questions

- Which LLM provider or providers, and which model tier for which task. Story generation and activity tailoring have different quality and latency needs.
- Which speech-to-text service handles Rioplatense Spanish and children's names well enough to make voice the default path.
- Whether the API is a single service or splits the content pipeline into a separate worker, and whether that content backend eventually becomes a CMS with its own database rather than tables in the app database. The content factory, where agents draft activities and humans review them, may be better as its own process than as part of the user-facing API.
- How the partner invite (0.6) and invitation-only sign-ups (0.5) work on top of Better Auth.
- How the holiday calendar is versioned and deployed. The activity and story catalog lives in the database, loaded by seeds (JUG-9).

## 12. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | September 2026 | First draft. Established React, Node, Postgres, and the droplet, with the reasoning for rejecting Vercel Hobby. |
| 0.2 | September 2026 | SPA confirmed: Vite, TanStack Router, and why not Next.js. Device targets set (mid-range Android and iPhone; desktop not a target). Service worker and offline rules. `juguemos.local` for local development. Fastify for the API. PostgreSQL now, a CMS with its own database if content grows. First scaffold committed: Compose, Caddy, API, placeholder page. |
| 0.3 | September 2026 | SPA built from the Plaza prototype in JavaScript with JSDoc (TypeScript tried and dropped): Vite, TanStack Router with per-route code splitting, npm workspaces (api, web) with no shared package, self-hosted fonts, and a production-only service worker with prompt-style updates. Caddy serves `web/dist`. |
| 0.4 | September 2026 | Authentication decided: Better Auth with email and password, sessions in PostgreSQL, sign-up behind an email allowlist. First tables: users, sessions, families, and family members. API foundations: layered by domain (routes, controllers, services), validated config, versioned SQL migrations with node-pg-migrate run by a one-shot service before the API starts, and integration tests against a real database. |
| 0.5 | September 2026 | The web runs on the API with no hardcoded data. Family profile (kids, pets, interests, toys), the activity and story catalog in the database with code-filled slots (no LLM in 0.1), and every suggested activity and written story saved per family. Catalog seeds load on every deploy; development seeds stay local. |
| 0.6 | September 2026 | Database access moves to Drizzle ORM: the schema is code, drizzle-kit generates the migrations from it, and they run under a lock that also refuses edited or skipped migrations. Better Auth uses its Drizzle adapter. node-pg-migrate and the hand-written SQL are gone. |
| 0.7 | September 2026 | The catalog admin at `/admin` revises activity templates in the database: add, edit, switch off, and delete, with deletes kept as rows so seeds never bring them back. No login yet, so it's off unless `ADMIN_ENABLED` is true. |
