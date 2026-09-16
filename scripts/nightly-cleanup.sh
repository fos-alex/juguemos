#!/usr/bin/env bash
#
# Nightly cleanup, run by the juguemos-nightly systemd user timer (JUG-150).
#
# It does the two things agents used to do by hand at the start of every
# session: remove worktrees whose PR has landed, and move Linear issues whose
# work has landed to Done.
#
# The worktree half is plain git and gh. The Linear half asks Claude Code to use
# the Linear MCP, because that signs in with OAuth and a script has no key of
# its own; the script works out which issues to look at and which are safe to
# close, so the agent only reads a status and sets it.
#
# Everything goes to the log and nothing interrupts anyone:
#   cat ~/.local/state/juguemos/nightly.log
#
# Options:
#   --dry-run   say what would happen, change nothing
#   --stdout    write to the terminal instead of the log

set -uo pipefail

REPO="${JUGUEMOS_REPO:-/home/alex/juegar}"
LOG="${JUGUEMOS_LOG:-$HOME/.local/state/juguemos/nightly.log}"
MODEL="${JUGUEMOS_MODEL:-haiku}"
SINCE_DAYS="${JUGUEMOS_SINCE_DAYS:-3}"
AGENT_TIMEOUT="${JUGUEMOS_AGENT_TIMEOUT:-300}"
# Issues already settled, so a nightly run never asks about the same one twice.
SETTLED="${JUGUEMOS_SETTLED:-$HOME/.local/state/juguemos/nightly-settled.txt}"

# Untracked files that are install or build debris rather than somebody's work.
# Anything else untracked makes a worktree count as dirty, and it is left alone.
STRAYS='(^|/)package-lock\.json$|(^|/)node_modules/|(^|/)dist/|(^|/)\.env$'

DRY_RUN=0
TO_STDOUT=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --stdout)  TO_STDOUT=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [[ $TO_STDOUT -eq 0 ]]; then
  mkdir -p "$(dirname "$LOG")"
  exec >>"$LOG" 2>&1
fi

say() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M')" "$*"; }
detail() { printf '          %s\n' "$@"; }
ids_in() { grep -oiE 'jug-[0-9]+' <<<"$1" | tr '[:lower:]' '[:upper:]' | sort -u; }

needs_alex=0

if [[ $DRY_RUN -eq 1 ]]; then say "nightly cleanup starting (dry run)"; else say "nightly cleanup starting"; fi

if [[ ! -d "$REPO/.git" ]]; then
  say "  $REPO is not a git repository, stopping"
  exit 1
fi

git -C "$REPO" fetch --prune --quiet origin \
  || say "  WARNING: git fetch failed, working from what is already local"

# --- Worktrees ---------------------------------------------------------------

# One "path<TAB>branch" row per worktree. A detached worktree gets an empty branch.
worktree_rows() {
  git -C "$REPO" worktree list --porcelain | awk '
    /^worktree /  { if (path != "") print path "\t" branch; path = substr($0, 10); branch = "" }
    /^branch /    { branch = substr($0, 8); sub(/^refs\/heads\//, "", branch) }
    END           { if (path != "") print path "\t" branch }
  '
}

removed=0
kept=0

while IFS=$'\t' read -r path branch; do
  [[ -z "$path" ]] && continue
  # The main checkout is never a candidate.
  [[ "$path" == "$REPO" ]] && continue

  if [[ -z "$branch" ]]; then
    say "  $(basename "$path"): detached, leaving it alone"
    kept=$((kept + 1))
    continue
  fi

  pr_state=$(cd "$REPO" && gh pr list --head "$branch" --state all --limit 1 \
    --json state --jq '.[0].state // ""' 2>/dev/null)
  remote_exists=0
  git -C "$REPO" show-ref --quiet --verify "refs/remotes/origin/$branch" && remote_exists=1

  # Only a merged or closed PR means the work has landed. A branch with no PR
  # is left alone on purpose: a worktree just created off main looks exactly
  # like one that was fast-forwarded into main, and guessing wrong deletes
  # work that was never started.
  if [[ "$pr_state" != "MERGED" && "$pr_state" != "CLOSED" ]]; then
    if [[ -z "$pr_state" ]]; then
      say "  $branch: no PR yet, leaving it alone"
    else
      say "  $branch: its PR is ${pr_state,,}, leaving it alone"
    fi
    kept=$((kept + 1))
    continue
  fi
  reason="its PR is ${pr_state,,}"

  # Refuse to remove work that exists nowhere else. A directory that is already
  # gone has nothing to lose; a status that cannot be read counts as dirty.
  if [[ ! -d "$path" ]]; then
    dirty=""
  elif ! status=$(git -C "$path" status --porcelain 2>&1); then
    say "  $branch: $reason, but its status could not be read. LEFT FOR ALEX:"
    detail "$status"
    needs_alex=1
    kept=$((kept + 1))
    continue
  else
    dirty=$(printf '%s\n' "$status" | grep -Ev "$STRAYS")
  fi

  if [[ -n "$dirty" ]]; then
    say "  $branch: $reason, but it has uncommitted changes. LEFT FOR ALEX:"
    detail "$dirty"
    needs_alex=1
    kept=$((kept + 1))
    continue
  fi

  if [[ $remote_exists -eq 1 ]]; then
    unpushed=$(git -C "$REPO" log --oneline "origin/$branch..$branch" 2>/dev/null)
    if [[ -n "$unpushed" ]]; then
      say "  $branch: $reason, but it has commits that were never pushed. LEFT FOR ALEX:"
      detail "$unpushed"
      needs_alex=1
      kept=$((kept + 1))
      continue
    fi
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    say "  $branch: $reason, would remove"
    removed=$((removed + 1))
    continue
  fi

  # --force because the checks above already proved the only files left are
  # install debris; without it git refuses a worktree holding a stray lockfile.
  say "  $branch: $reason, removing"
  if git -C "$REPO" worktree remove --force "$path"; then
    git -C "$REPO" branch -D "$branch" >/dev/null 2>&1 \
      || say "    could not delete the local branch, left for Alex"
    if [[ $remote_exists -eq 1 ]]; then
      git -C "$REPO" push --quiet origin --delete "$branch" 2>/dev/null \
        || say "    could not delete the remote branch, left for Alex"
    fi
    removed=$((removed + 1))
  else
    say "    could not remove it. LEFT FOR ALEX"
    needs_alex=1
    kept=$((kept + 1))
  fi
done < <(worktree_rows)

[[ $DRY_RUN -eq 1 ]] || git -C "$REPO" worktree prune
say "  worktrees: $removed removed, $kept left alone"

# --- Linear ------------------------------------------------------------------

# Which issues a merged PR actually finished. An id in the branch name is the
# PR's own issue, because that is the branch Linear named; an id that appears
# only in the title is a mention, and closing it would be a guess. So
# "Record a voice note and transcribe it (JUG-95, JUG-103)" on branch
# fosalex/jug-95-... finishes JUG-95 and only mentions JUG-103.
cutoff=$(date -u -d "$SINCE_DAYS days ago" '+%Y-%m-%dT%H:%M:%SZ')
finished=""
mentioned=""

while IFS=$'\t' read -r branch title; do
  [[ -z "$branch$title" ]] && continue
  branch_ids=$(ids_in "$branch")
  title_ids=$(ids_in "$title")
  if [[ -n "$branch_ids" ]]; then
    finished+="$branch_ids"$'\n'
    mentioned+=$(comm -23 <(printf '%s\n' $title_ids) <(printf '%s\n' $branch_ids))$'\n'
  elif [[ $(printf '%s\n' $title_ids | grep -c .) -eq 1 ]]; then
    # No branch to go by, but the title names exactly one issue.
    finished+="$title_ids"$'\n'
  else
    mentioned+="$title_ids"$'\n'
  fi
done < <(cd "$REPO" && gh pr list --state merged --limit 100 \
  --json headRefName,title,mergedAt \
  --jq ".[] | select(.mergedAt > \"$cutoff\") | .headRefName + \"\t\" + .title" 2>/dev/null)

# Commits pushed straight to main, which have no PR behind them. One id is the
# commit's issue; several are mentions.
while IFS= read -r subject; do
  [[ -z "$subject" ]] && continue
  subject_ids=$(ids_in "$subject")
  if [[ $(printf '%s\n' $subject_ids | grep -c .) -eq 1 ]]; then
    finished+="$subject_ids"$'\n'
  else
    mentioned+="$subject_ids"$'\n'
  fi
done < <(git -C "$REPO" log --since="$SINCE_DAYS days ago" --format='%s' --no-merges origin/main 2>/dev/null)

drop_settled() {
  sort -u | grep -E '^JUG-[0-9]+$' \
    | { [[ -s "$SETTLED" ]] && comm -23 - <(sort -u "$SETTLED") || cat; }
}
finished=$(printf '%s\n' "$finished" | drop_settled)
# An issue a PR finished is never also just a mention.
mentioned=$(printf '%s\n' "$mentioned" | drop_settled \
  | { [[ -n "$finished" ]] && comm -23 - <(printf '%s\n' "$finished") || cat; })

finished_line=$(printf '%s ' $finished); finished_line="${finished_line% }"
mentioned_line=$(printf '%s ' $mentioned); mentioned_line="${mentioned_line% }"

if [[ -z "$finished_line" && -z "$mentioned_line" ]]; then
  say "  linear: nothing landed in the last $SINCE_DAYS days, no agent needed"
elif [[ $DRY_RUN -eq 1 ]]; then
  say "  linear: would ask $MODEL to close [${finished_line:-none}] and report [${mentioned_line:-none}]"
else
  say "  linear: asking $MODEL about ${finished_line:-none} (mentions: ${mentioned_line:-none})"

  prompt="You are reconciling Linear with what has landed on main in the Juguemos repo.

FINISHED - a merged pull request or commit on this issue's own branch: ${finished_line:-none}
For each, read its current status with the Linear MCP. If it is Done, Canceled or Duplicate, leave it alone. Otherwise set it to Done.

MENTIONED ONLY - named in a pull request that was really about another issue: ${mentioned_line:-none}
Do not change these. Just report each one's current status so Alex can decide.

Change nothing else: no comments, no assignees, no other issues, and no status other than Done. Reply with one line per issue, '<id>: <status before> -> <what you did>', and nothing else."

  answer=$(cd "$REPO" && timeout "$AGENT_TIMEOUT" claude -p "$prompt" \
    --model "$MODEL" \
    --allowedTools "mcp__linear-server__list_issues" "mcp__linear-server__get_issue" "mcp__linear-server__save_issue" 2>&1)
  agent_status=$?

  if [[ $agent_status -ne 0 ]]; then
    say "  linear: the agent failed, so these stay on the list for tomorrow"
    needs_alex=1
  else
    # Settled either way: closed, already closed, or reported for Alex once.
    mkdir -p "$(dirname "$SETTLED")"
    printf '%s\n' $finished $mentioned >>"$SETTLED"
    [[ -n "$mentioned_line" ]] && needs_alex=1
  fi
  detail "${answer:-(no answer)}"
fi

[[ $needs_alex -eq 1 ]] && say "  ^ something above needs Alex"
say "nightly cleanup done"
