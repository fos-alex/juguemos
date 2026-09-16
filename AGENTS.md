# Working on Ludi

Rules for any agent working in this repo. Claude Code reads this through `CLAUDE.md`, and opencode reads it directly. Each project has its own guide as well, so read the one for the code you are changing:

| Guide | Covers |
|---|---|
| [web/AGENTS.md](web/AGENTS.md) | The React SPA: routes, components, local state, night mode, and the design rules that live in the code |
| [api/AGENTS.md](api/AGENTS.md) | The Fastify API: layers, auth and the sign-up allowlist, migrations, seeds, and tests |

## The project

Ludi is a play coach for families in Buenos Aires. Start with these documents:

| Document | Read it for |
|---|---|
| [docs/product-concept.md](docs/product-concept.md) | What the product is and why |
| [docs/constitution.md](docs/constitution.md) | The commitments and guardrails every decision follows |
| [docs/architecture.md](docs/architecture.md) | The technical decisions and why they were made |
| [docs/design.md](docs/design.md) | How the app looks, and the rules behind it: colour, type, iconography, the app icon |
| [docs/brand-brief.md](docs/brand-brief.md) | The brand as Alex judges it, and the brand decisions still open |
| [docs/releases.md](docs/releases.md) | What goes in each release, from 0.1 to 1.0 |

## Product rules

**No outside testers until the guardrails are complete.**

**Start simple.** Build a solid core loop first. Don't add features from the product concept that `docs/releases.md` hasn't scheduled, and don't pull parked features forward without asking.

## The repo

An npm workspace with two projects, run locally by Docker Compose behind Caddy:

| Path | What it is |
|---|---|
| `web/` | The React SPA |
| `api/` | The Fastify API and its PostgreSQL migrations |
| `caddy/` | Caddy's image, which builds the web app (`Dockerfile`), and its `Caddyfile`, which serves it and proxies `/api` to the API, at `https://ludi.local:3000` and on `127.0.0.1:3001` for phones over Tailscale, or at `https://ludi.ar` on the droplet |
| `docker-compose.yml` | Postgres, the one-shot migrations, the API, and Caddy |
| `scripts/` | Repo tooling, run by timers rather than by agents. See [Nightly cleanup](#nightly-cleanup) |
| `docs/` | Product, architecture, design, and releases |

Every 0.1 screen is built and runs on the API: accounts with a required session, the family profile, and activities and stories from templates in the database. Only Google sign-in (0.3) and email verification are still missing, since they need services Ludi doesn't have yet.

**JSDoc guides, nothing enforces it.** Both projects are plain JavaScript. JSDoc types are there so agents and readers can follow the data; there is no TypeScript, no typecheck, and no `.ts` file, and that is Alex's choice (JUG-70). Keep JSDoc accurate when you change a shape, but don't add a typechecker or a `tsconfig` or `jsconfig`.

## Writing

**No mannered prose.** Code comments, docs, commit messages, PR descriptions, and Linear are written plainly: say what something does or why, in ordinary words. No literary turns, aphorisms, personification, or clever phrasing.

## Tracking work in Linear

Linear must always show what is being built and what has finished.

- **Workspace:** Juguemos, team **Juguemos**, issue keys `JUG-…`. Linear and the GitHub repo (`fos-alex/juguemos`) keep the old name; the product is Ludi
- **Projects:** one per release (`0.1 — ¿Me gusta?` through `1.0 — Juguemos`), plus `Later` for work after 1.0 and parked ideas
- **Labels:** Feature, Content, Infrastructure, Decision, Guardrails, Improvement, Bug
- **Statuses:** Backlog → Todo → In Progress → In Review → Done, plus Canceled and Duplicate

Agents reach Linear through its MCP server. Use its tools to find, create, update, and comment on issues directly; don't ask Alex to do in Linear what the MCP can do.

**Linear and GitHub are integrated.** Linear links a branch, PR, or commit to an issue when its name, title, or message contains the issue ID (`JUG-12`). It then moves the issue as the PR progresses, including to **Done** when the PR is merged. Let the integration do that work instead of repeating it by hand, and check that it did.

**Be succinct in Linear.** Linear is for status and for seeing which tasks need Alex's input. It isn't a work log: nobody reads long reports, and writing them wastes tokens. Keep comments to a sentence or two, and task descriptions to a few lines. Write a fuller comment only when another agent will pick the task up later and needs the context to continue.

**Feature issues are specs.** A feature's description is what an agent builds from, so it says what to build, not how: what the feature is, how it behaves, the rules it must keep, what's out of scope, and when it's done. When a feature needs more than one PR, split it into sub-issues an agent can finish in one PR each, and link them with blocking relations. When a decision changes a feature, update its spec.

Every task has a Linear issue:

1. **Starting a task.** Find its issue. If there isn't one, create it in the right release project with a clear title and a short description. Move it to **In Progress** and assign it to Alex.
2. **While working.** Comment only for a question for Alex, a blocker, or a decision Alex should know about. Say plainly what you need from them.
3. **Ready for review.** Move it to **In Review**. Comment only if something needs Alex: a decision, something to try, or the commit message for uncommitted changes. For a PR, check that the integration linked it.
4. **Finished.** Merged PRs move to **Done** through the integration. Uncommitted changes move to **Done** once Alex has committed them.

Don't cancel issues, move them between releases, or change a release's scope without asking Alex. When scope changes, update `docs/releases.md` and Linear together so they stay in sync.

## Git

We work on `main`, and every PR targets `main`.

**No `Co-Authored-By` trailers.** Don't add `Co-Authored-By` lines, or any other agent attribution, to commit messages.

**Small changes stay uncommitted.** If the change is small, leave it uncommitted in the main checkout. Alex reviews and commits it.

**Big changes get a worktree and a PR.** Use a worktree and a pull request when a change is big, is a separate feature, or is a distinct workstream.

- Name the branch after the Linear issue's branch name (for example `fosalex/jug-12-family-onboarding`). The integration uses it to link the PR to the issue.
- Create the worktree next to the repo, not inside it:
  ```bash
  git fetch origin
  git worktree add ../juegar-worktrees/jug-12-family-onboarding -b fosalex/jug-12-family-onboarding origin/main
  ```
- Push the branch and open the PR with `gh pr create --base main`.

**Alex merges PRs.** Never merge a PR unless Alex has explicitly authorized that specific merge.

## Nightly cleanup
- **Removes worktrees whose PR has been merged or closed,** with their local and remote branches. It never touches a worktree with uncommitted changes or unpushed commits, and never one whose PR is still open or that has no PR yet.
- **Moves Linear issues whose work has landed to Done.** An issue id in a merged PR's branch name is that PR's own issue and gets closed; an id that appears only in the title is a mention, and is reported rather than changed.

It writes to `~/.local/state/ludi/nightly.log` and interrupts nobody.
`~/.local/state/ludi/nightly-settled.txt` is the list of issues it has already dealt with, so it never asks about the same one twice. Delete a line to have it look at that issue again.
