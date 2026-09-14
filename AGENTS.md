# Working on Juguemos

Rules for any agent working in this repo. Claude Code reads this through `CLAUDE.md`, and opencode reads it directly.

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

## The app today

`web/` is the React SPA (Vite, TanStack Router file routes, plain JavaScript with JSDoc). Every 0.1 screen from the Plaza handoff is built. Accounts are real (sign-up, sign-in, sign-out, and `/api/me`), and using the app needs a valid session; everything else runs on mocked data.

| Route | Screen (mockup id) |
|---|---|
| `/entrada` | Entrada (`2a`) |
| `/cuenta` | Crear cuenta (`2b`). `?modo=entrar` switches it to sign-in mode, and `?campo=email` focuses the email field |
| `/verificar` | Verificar el email (`2c`) |
| `/familia/contanos` | Contame de tu familia (`2d`) |
| `/familia/revisar` | ¿Está bien así? (`2f`), or Entendió mal (`2g`) when the parse flags fields |
| `/familia/corregir` | Corregir (`2h`). `?campo=` focuses one field |
| `/familia` | Mi familia, the card's permanent home after onboarding |
| `/ajustes` | Ajustes, not designed yet and kept minimal |
| `/` | Home: `2j`, or `2i` when there is no last idea. The drawer (`2k`), thinking (`2l`), and offline (`2q`) are states of Home |
| `/idea/$id` | Actividad (`2m`). Otro juego swaps in place (`2p`) and pushes history, so back returns to the previous one |
| `/idea/$id/reloj` | El reloj (`2o`) |
| `/cuentos` | ¿Cuál leemos hoy? (`2r`) |
| `/cuento/$id` | Escribiendo (`2s`), then the reading screen (`2t`, or `2u` at night) |

How it fits together:

- **Primitives** live in `web/src/components/`: `Screen` (with `Header`, `Body`, `Footer`), `PrimaryButton`, `SecondaryButton`, `QuietButton`, `TertiaryButton`, `GoogleButton`, `Dots`, `Card`, `MetaLabel`, `Label`, `Skeleton`, `Field`, `StepList`, `Drawer`, `Wordmark`, `FamilyCard`, `ActivityView`, and `ThemeToggle`. Build new screens from them rather than one-off layouts.
- **The mock API** is `web/src/api/mock.js`, re-exported by `web/src/api/index.js`. Screens import only from `web/src/api`. Moving an endpoint to the real API means adding it next to `api/auth.js` (the account functions, already real) and re-exporting it from `api/index.js` with the same function shape. The example family, activities, and stories are in `api/fixtures.js`.
- **Local state** is in `web/src/lib/store.js`: one localStorage key per piece of state, read with `useStored(key)`. It caches the account, the family, activities, stories, the timer, and story positions. That cache is what keeps the last idea and the open story readable offline.
- **The session guard** is in `routes/__root.jsx`. Before each navigation it awaits `ensureSession()` from `api/auth.js`, which confirms the session with `/api/me` at most every five minutes and again when the app returns to the foreground. A 401 signs the device out. No answer (offline, a weak signal, a server failure) keeps the cached account, so the last juego stays readable offline. Then the first run holds its order: no account goes to `/entrada`, and no family to `/familia/contanos`. Email verification is skipped until the API can send email, so `/verificar` redirects.
- **The API** in `api/src` is layered by domain (`accounts/`, `families/`, `health/`, `auth/`). Routes map URLs to controllers, controllers handle HTTP, and services hold the business logic and the SQL. Every route needs a session, found on `request.session`, unless it sets `config: { public: true }` as health and Better Auth's routes do. Wire new dependencies in `app.js` only, and read the environment only in `config.js`. Give every route a response schema, because it also decides which fields leave the server. Cover new endpoints with integration tests in `api/test/`.
- **Schema changes are migrations.** Create one with `npm run migration:create -w api -- <name>` and write plain SQL with an up and a down section. Never create tables from application code, and never edit a migration that has already run anywhere; add a new one. Better Auth's tables are part of the migrations too: plural names and snake_case columns, mapped in `api/src/auth/schema.js`.
- **Data for exploring the app comes from seeds,** never from application code. No placeholder records or side effects that exist only to have data. Add development data to `api/seeds/development.js`; `npm run seed -w api` loads it through Better Auth and the services, skips what already exists, and refuses to run in production.
- **Tokens** are in `web/src/styles/tokens.css`, with light and dark sets. Components use tokens, never hex values, so nothing depends on a light background.
- **Night mode** lives in React:
  - **The rule** is plain functions in `web/src/lib/theme.js`: dark from 19:00 to 07:00 local time, unless a one-tap choice still holds. A choice lasts until the next 19:00 or 07:00.
  - **`ThemeProvider`**, in the root layout, re-checks the rule at each switch and when the app returns to the foreground, then paints it on `<html>`.
  - **`applyInitialTheme()`** in `main.jsx` sets the theme once, before React renders.
  - **Components** read it with `useTheme()`, which returns `{ dark, toggle }`. `ThemeToggle` is the reading footer's button, and Home's drawer has a row.
  - **Overrides:** `?tema=oscuro` or `?tema=claro` counts as a tap.
- **No inline scripts in `index.html`.** App logic goes in `web/src`, where it is built, tested, and cached with the rest.
- **JSDoc guides, nothing enforces it.** Types in JSDoc are there so agents and readers can follow the data; there is no TypeScript, no typecheck, and no `.ts` file, and that is Alex's choice (JUG-70). Keep JSDoc accurate when you change a shape, but don't add a typechecker or `tsconfig`/`jsconfig`. The router's generated `web/src/routeTree.gen.js` is plain JS for the same reason; never edit it by hand.
- **The handoff's two open decisions:** Home uses `2j`, whose last-idea card hides when there is no idea yet. Activity shows `2m` (why-first); `ActivityView` keeps the `2n` layout until Alex picks one.
- **Google sign-in** is hidden on `2a` and `2b` until Sign in with Google arrives in 0.3 (`docs/releases.md`); `GoogleButton` waits for it. A sign-in without a real session would only bounce back to `/entrada`.

## Design rules from the Plaza handoff

The spec is `docs/design_handoff_juguemos_plaza/`. Its README has the tokens, the type scale, and every screen. The mockups (`2a`–`2u`) are the spec, and the wireframes' notes (`1a`–`1t`) say what each screen must never do. Read the README before changing any UI. These are the rules that are easiest to undo by accident:

- **A tool for grown-ups, about play.** No mascot, character, or cartoon. The wordmark's three dots never get a face and never grow past splash size. Fredoka 600 is already at its limit: no heavier weight and no rounded body font.
- **No sound, ever.** That includes the moment the activity timer ends. No vibration either.
- **Motion guides and never demands.** Use 120–200 ms ease-out with no bounce, spring, or confetti, and respect `prefers-reduced-motion`.
- **Flat.** No gradients, glossy or 3D buttons, or drop-shadow buttons. The palette is the token set and nothing more.
- **Never clinical and never a scoreboard.** No progress rings, streaks, points, badges, counts, percentages, "you stopped early", or days since the family last played. The only progress bar in the app marks position in a story. The timer never logs or compares sessions.
- **One idea, never a list or a feed.** The wait for an idea happens on Home, and Home's last-idea card is capped at one.
- **The family's words stay exactly as typed.** Toy names are never normalised, capitalised, or autocorrected, so those inputs set `autoCorrect="off"` and `autoCapitalize="none"`.
- **Colour is never the only signal.** Flagged rows use a tint, a bar, and words. The current drawer item uses a filled row.
- **No art on the reading screen,** even after 0.2 brings illustration. The wake lock holds from the moment a story starts being written until the parent leaves it.
- **Thumb zone.** Primary actions sit in the lower half, and every tap target is at least 48 px. The design width is 390 px, capped with `max-width`.
- **Copy is Rioplatense Spanish with *vos*,** taken verbatim from the mockups. Failures say "Uy, algo falló. ¿Probamos de nuevo?" with no blame and no error codes. Field errors go under the field, in words, never in a red banner. Offline is "Estás sin conexión. El último juego sigue acá." What Juguemos suggests is a *juego*, never an *idea*, and Home's button says "¡Juguemos!". That is Alex's change (JUG-69); the mockups still say *idea* and "¿Qué hacemos ahora?".
- **Copy still needs a voice pass** in these places, marked `Voice pass pending` in code: Listo, Prefiero un formulario, Guardar, the line after six seconds of thinking, Empezar, the timer screen, Otras opciones, and all account-screen copy.
- **Out of scope for 0.1, so don't build it:** the toy box, voice recording (the mic is a placeholder), goals, categories and filters, weather, the journal, tips, recaps, holidays, the partner invite, post-activity feedback, and an English interface.

## Tracking work in Linear

Alex follows the build in Linear, so Linear must always show what is being built and what has finished.

- **Workspace:** Juguemos, team **Juguemos**, issue keys `JUG-…`
- **Projects:** one per release (`0.1 — ¿Me gusta?` through `1.0 — Juguemos`), plus `Later` for work after 1.0 and parked ideas
- **Labels:** Feature, Content, Infrastructure, Decision, Guardrails, Improvement, Bug
- **Statuses:** Backlog → Todo → In Progress → In Review → Done, plus Canceled and Duplicate

opencode connects to Linear through the `linear` MCP server (`opencode.json`), authenticated by the `LINEAR_API_KEY` environment variable. Use its tools to find, create, update, and comment on issues directly; don't ask Alex to do in Linear what the MCP can do.

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
