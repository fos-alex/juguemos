# Working on Juguemos

Rules for any agent working in this repo. Claude Code reads this through `CLAUDE.md`, and opencode reads it directly. Each project has its own guide as well, so read the one for the code you are changing:

| Guide | Covers |
|---|---|
| [web/AGENTS.md](web/AGENTS.md) | The React SPA: routes, components, local state, night mode, and the Plaza design rules |
| [api/AGENTS.md](api/AGENTS.md) | The Fastify API: layers, auth and the sign-up allowlist, migrations, seeds, and tests |

## The project

Juguemos is a play coach for families in Buenos Aires. Start with these documents:

| Document | Read it for |
|---|---|
| [README.md](README.md) | Stack and local development |
| [docs/product-concept.md](docs/product-concept.md) | What the product is and why |
| [docs/constitution.md](docs/constitution.md) | The commitments and guardrails every decision follows |
| [docs/architecture.md](docs/architecture.md) | How it is built and run |
| [docs/releases.md](docs/releases.md) | What goes in each release, from 0.1 to 1.0 |

## Product rules

**No outside testers until the guardrails are complete.** Only Alex's family uses Juguemos until then. Whenever work touches inviting testers, sign-ups, sharing the app, or deploying it for anyone else, remind Alex of this rule.

**Start simple.** Build a solid core loop first. Don't add features from the product concept that `docs/releases.md` hasn't scheduled, and don't pull parked features forward without asking.

## The repo

An npm workspace with two projects, run locally by Docker Compose behind Caddy:

| Path | What it is |
|---|---|
| `web/` | The React SPA, built to `web/dist` |
| `api/` | The Fastify API and its PostgreSQL migrations |
| `caddy/Caddyfile` | Serves `web/dist` and proxies `/api` to the API, at `https://juguemos.local:3000` and on `127.0.0.1:3001` for phones over Tailscale |
| `docker-compose.yml` | Postgres, the one-shot migrations, the API, and Caddy |
| `docs/` | Product, architecture, releases, and the Plaza design handoff |

Every 0.1 screen is built and runs on the API: accounts with a required session, the family profile, and activities and stories from templates in the database. Only Google sign-in (0.3) and email verification are still missing, since they need services Juguemos doesn't have yet.

**JSDoc guides, nothing enforces it.** Both projects are plain JavaScript. JSDoc types are there so agents and readers can follow the data; there is no TypeScript, no typecheck, and no `.ts` file, and that is Alex's choice (JUG-70). Keep JSDoc accurate when you change a shape, but don't add a typechecker or a `tsconfig` or `jsconfig`.

## Tracking work in Linear

Alex follows the build in Linear, so Linear must always show what is being built and what has finished.

- **Workspace:** Juguemos, team **Juguemos**, issue keys `JUG-…`
- **Projects:** one per release (`0.1 — ¿Me gusta?` through `1.0 — Juguemos`), plus `Later` for work after 1.0 and parked ideas
- **Labels:** Feature, Content, Infrastructure, Decision, Guardrails, Improvement, Bug
- **Statuses:** Backlog → Todo → In Progress → In Review → Done, plus Canceled and Duplicate

Agents reach Linear through its MCP server; for opencode, that is the `linear` entry in `opencode.json`, which signs in with OAuth. Use its tools to find, create, update, and comment on issues directly; don't ask Alex to do in Linear what the MCP can do.

**Linear and GitHub are integrated.** Linear links a branch, PR, or commit to an issue when its name, title, or message contains the issue ID (`JUG-12`). It then moves the issue as the PR progresses, including to **Done** when the PR is merged. Let the integration do that work instead of repeating it by hand, and check that it did.

**Be succinct in Linear.** Linear is for status and for seeing which tasks need Alex's input. It isn't a work log: nobody reads long reports, and writing them wastes tokens. Keep descriptions to a few lines and comments to a sentence or two. Write a fuller comment only when another agent will pick the task up later and needs the context to continue.

Every task has a Linear issue:

1. **Starting a task.** Find its issue. If there isn't one, create it in the right release project with a clear title and a short description. Move it to **In Progress** and assign it to Alex.
2. **While working.** Comment only for a question for Alex, a blocker, or a decision Alex should know about. Say plainly what you need from them.
3. **Ready for review.** Move it to **In Review**. Comment only if something needs Alex: a decision, something to try, or the commit message for uncommitted changes. For a PR, check that the integration linked it.
4. **Finished.** Merged PRs move to **Done** through the integration. Uncommitted changes move to **Done** once Alex has committed them.

Don't cancel issues, move them between releases, or change a release's scope without asking Alex. When scope changes, update `docs/releases.md` and Linear together so they stay in sync.

## Git

We work on `main`, and every PR targets `main`.

**Small changes stay uncommitted.** If the change is small, leave it uncommitted in the main checkout. Alex reviews and commits it. Suggest a commit message that includes the issue ID, so Linear links the commit.

**Big changes get a worktree and a PR.** Use a worktree and a pull request when a change is big, is a separate feature, or is a distinct workstream.

- Name the branch after the Linear issue's branch name (for example `fosalex/jug-12-family-onboarding`). The integration uses it to link the PR to the issue.
- Create the worktree next to the repo, not inside it:
  ```bash
  git fetch origin
  git worktree add ../juegar-worktrees/jug-12-family-onboarding -b fosalex/jug-12-family-onboarding origin/main
  ```
- Push the branch and open the PR with `gh pr create --base main`.

**Alex merges PRs.** Never merge a PR unless Alex has explicitly authorized that specific merge.

**Clean up after a merge.** Once a PR is merged, remove its worktree and local branch, and delete the remote branch if GitHub hasn't:

```bash
git worktree remove ../juegar-worktrees/jug-12-family-onboarding
git branch -D fosalex/jug-12-family-onboarding
git push origin --delete fosalex/jug-12-family-onboarding
git worktree prune
```

**Remove stale worktrees.** At the start of every session, run `git worktree list`. A worktree is stale when its PR has been merged or closed, or its branch no longer exists on the remote. Remove stale worktrees and their local branches. If one still has uncommitted or unpushed work, ask Alex before removing it.

## At the start of every session

1. Run `git worktree list` and remove stale worktrees.
2. Check Linear for issues **In Review** whose change has since been committed or merged, and move any the integration didn't already move to **Done**.
