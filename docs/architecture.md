# Juguemos — Architecture

**Version:** 0.1 · September 2026 · Owner: Alex Otero

*A living document. Decisions here are revisited as the product takes shape, and each release may change it.*

---

## 1. Scope

This document covers how Juguemos is built and run. The product itself is described in [product-concept.md](product-concept.md), and the principles behind the decisions are in [constitution.md](constitution.md).

Version 1 targets Argentina, ages 1–5, on responsive web.

## 2. Decisions so far

| Area | Decision | Status |
|---|---|---|
| Client | React, responsive web, phone-first | Decided |
| Server | Node.js, long-running HTTP API | Decided |
| Database | PostgreSQL | Decided |
| Hosting | Existing DigitalOcean droplet | Decided |
| Local development | Docker Compose, same as production | Decided |
| TLS and reverse proxy | Caddy, with automatic certificates | Proposed |
| Language | TypeScript across client and server | Proposed |
| Native mobile apps | Not in v1 | Decided |

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

## 5. Client

React, built as a static bundle and served by Caddy.

The interface is phone-first and one-handed, since a parent is often holding a toddler. Text is large, tap targets are generous, and the reading screen for Story Time keeps the screen awake and switches to a warm dark mode near bedtime.

Voice is the primary input, captured in the browser and sent to the API for transcription. Browser support and permissions for microphone capture need to be validated early, including on iOS Safari, which is the riskiest target.

The app should keep working when the connection is poor. Current suggestions, active goals, and the last story a parent opened should remain readable offline, since play often happens in a plaza or a bedroom with weak signal.

## 6. Server

A Node.js HTTP API, organized around the product's domains: family and household, toy box, activities and play, goals, tips, stories, special days, and moments.

Responsibilities that belong to the server and nowhere else:

- All database access.
- All AI calls, including activity tailoring and story generation, with the safety constraints of each activity template enforced server-side.
- Voice transcription, after which the audio is discarded rather than stored.
- Calls to the weather and maps providers, with responses cached so the same neighborhood is not queried repeatedly.
- The holiday calendar, maintained per country and per year, starting with Argentina.

Long-running AI work is the main performance concern. Story generation should stream to the client where possible, so the parent sees text appear rather than waiting on a blank screen.

## 7. Data

PostgreSQL, chosen because the model is genuinely relational: families, households, adults and their play styles, kids, toys, activity templates, goals, tips, stories, and moments, with links between nearly all of them. The core query of the product, finding activities for a given age, duration, energy level, and location that use toys this family owns, is exactly what SQL handles well.

Postgres also offers two things worth having later: JSONB for the flexible parts, such as activity templates and their tailoring slots, and `pgvector` if semantic matching over the activity and story catalog proves useful.

The detailed schema is not settled. It is the next major piece of design work, and it is the backbone of the product, since the tags on activities, toys, goals, and tips determine what the app can actually do.

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
- Whether the API is a single service or splits the content pipeline into a separate worker. The content factory, where agents draft activities and humans review them, may be better as its own process than as part of the user-facing API.
- Authentication: how parents sign in and how the partner invite works.
- Whether offline support needs a service worker in v1 or can be added later.
- How the activity catalog and holiday calendar are versioned and deployed: as database records, as files in the repo, or both.

## 12. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | September 2026 | First draft. Established React, Node, Postgres, and the droplet, with the reasoning for rejecting Vercel Hobby. |
