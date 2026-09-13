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

## Tracking work in Linear

Alex follows the build in Linear, so Linear must always show what is being built and what has finished.

- **Workspace:** Juguemos, team **Juguemos**, issue keys `JUG-…`
- **Projects:** one per release (`0.1 — ¿Me gusta?` through `1.0 — Juguemos`), plus `Later` for work after 1.0 and parked ideas
- **Labels:** Feature, Content, Infrastructure, Decision, Guardrails, Improvement, Bug
- **Statuses:** Backlog → Todo → In Progress → In Review → Done, plus Canceled and Duplicate

opencode connects to Linear through the `linear` MCP server (`opencode.json`), authenticated by the `LINEAR_API_KEY` environment variable. Use its tools to find, create, update, and comment on issues directly; don't ask Alex to do in Linear what the MCP can do.

Every task has a Linear issue, and the issue is updated at each step:

1. **Starting a task.** Find its issue. If there isn't one, create it in the right release project with a clear title and a short description. Move it to **In Progress**, assign it to Alex, and comment with what you are about to do and which agent is doing it (Claude Code or opencode).
2. **While working.** Comment when something meaningful happens: a decision, a change of plan, a blocker, or a question for Alex.
3. **Ready for review.** Move it to **In Review** and comment with what changed, how it was verified, and anything left open. For uncommitted changes, list the files. For a PR, attach the PR link.
4. **Finished.** Move it to **Done** once Alex has committed the change or merged the PR.

Don't cancel issues, move them between releases, or change a release's scope without asking Alex. When scope changes, update `docs/releases.md` and Linear together so they stay in sync.

## Git

We work on `main`, and every PR targets `main`.

**Small changes stay uncommitted.** If the change is small, leave it uncommitted in the main checkout. Alex reviews and commits it.

**Big changes get a worktree and a PR.** Use a worktree and a pull request when a change is big, is a separate feature, or is a distinct workstream.

- Name the branch after the Linear issue's branch name (for example `fosalex/jug-12-family-onboarding`), so the PR links to the issue.
- Create the worktree next to the repo, not inside it:
  ```bash
  git fetch origin
  git worktree add ../juegar-worktrees/jug-12-family-onboarding -b fosalex/jug-12-family-onboarding origin/main
  ```
- Push the branch and open the PR with `gh pr create --base main`, then attach the PR to the Linear issue.

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
2. Check Linear for issues **In Review** whose change has since been committed or merged, and move them to **Done**.
