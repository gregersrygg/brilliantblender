---
name: Update upcoming sets
on:
  workflow_dispatch:

permissions:
  contents: read
  issues: read
  pull-requests: read

engine: copilot

timeout-minutes: 20

# Outbound network allow-list. Anything else is blocked.
network:
  allowed:
    - press.pokemon.com

# Broad shell access (`:*`) for the same reason as the set-legality workflow:
# Copilot CLI's prefix-matching on a fine-grained allow-list is a whack-a-mole
# exercise across curl flag combinations. The real boundaries remain:
#   - network firewall: only press.pokemon.com is reachable (network.allowed)
#   - container: ephemeral, no persistent state
#   - env: COPILOT_GITHUB_TOKEN / GITHUB_MCP_SERVER_TOKEN excluded
#   - post-step validator: any diff outside src/data/upcoming-sets.json fails the job
tools:
  bash:
    - ":*"
  edit:
  github:
    allowed:
      - list_issues
      - search_issues
      - issue_read

# Declarative side-effects the agent can request. The runtime applies these with
# its own trusted credentials — the agent itself has no write/issue token.
safe-outputs:
  create-issue:
    max: 5
    title-prefix: "[upcoming-sets] "
    labels: [automation, upcoming-sets]

# After the agent finishes, validate and commit. Unlike the set-legality agent,
# a no-op run is legitimate here (no newly-announced set), so there is NO
# "fail if no diff" guard — the commit step simply skips when nothing changed.
post-steps:
  - name: Validate agent output
    run: node scripts/validate-upcoming.mjs

  - name: Commit and push if changed
    env:
      SNAPSHOT_PUSH_TOKEN: ${{ secrets.SNAPSHOT_PUSH_TOKEN }}
    run: |
      # Stage first so a brand-new (untracked) file on the first run is detected —
      # `git diff` alone ignores untracked files.
      git add src/data/upcoming-sets.json
      if git diff --cached --quiet -- src/data/upcoming-sets.json; then
        echo "No upcoming-sets changes — nothing to commit."
        exit 0
      fi
      # gh-aw scrubs git credentials from the workspace before running the agent
      # so the agent can't push on its own. Re-attach SNAPSHOT_PUSH_TOKEN via the
      # remote URL so this trusted post-step can push.
      git config user.name "github-actions[bot]"
      git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
      git remote set-url origin "https://x-access-token:${SNAPSHOT_PUSH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
      git commit -m "chore: update upcoming sets $(date -u +%Y-%m-%d)"
      git push origin "HEAD:${GITHUB_REF_NAME}"

# Use the same PAT as the snapshot workflow so pushes to main work.
checkout:
  token: ${{ secrets.SNAPSHOT_PUSH_TOKEN }}
---

# Update upcoming sets

You maintain `src/data/upcoming-sets.json` for the Brilliant Blender Pokémon TCG
deck builder. This file lists Pokémon TCG expansions that have been **announced but
not yet released**, so the app can show players how soon a set arrives (and, for
main sets, when its Prerelease window opens). Wrong dates mislead players, so be
careful and never guess.

The card database the app depends on only learns about a set on its release day, but
The Pokémon Company announces each expansion on `press.pokemon.com` roughly 10–11
weeks earlier. This workflow harvests those announcements.

## The data file

`src/data/upcoming-sets.json` is a **JSON array** (there is no API set ID before a
set releases, so entries cannot yet be keyed by it). Each entry:

```json
{
  "setId": null,
  "name": "Pitch Black",
  "series": "Mega Evolution",
  "releaseDate": "2026-07-17",
  "prereleaseDate": "2026-07-04",
  "isSpecialSet": false,
  "sourceUrl": "https://press.pokemon.com/en/releases/...",
  "fetchedAt": "2026-06-09T08:00:00Z"
}
```

- `setId` — the API set ID (e.g. `"me5"`). **Always `null` here** — it is not
  assigned until the set releases. It is a placeholder to be backfilled by hand once
  the set ships; the agent always writes `null`, never guesses it, and opens a
  tracking issue when it adds a new set (see step 5) so the backfill isn't forgotten.
- `name` — the **bare** expansion name as it appears in-game (the part after the
  `—` in "Mega Evolution—Pitch Black"), so it matches the API/`set-legality.json`
  set name. **Not** the series-prefixed title.
- `series` — the parent series, e.g. "Mega Evolution" or "Scarlet & Violet".
- `releaseDate` — the **physical/tabletop** release date (YYYY-MM-DD). This is *not*
  the Pokémon TCG Live date (usually ~1 day earlier) and *not* the Prerelease date.
- `prereleaseDate` — the date Prerelease tournaments begin (YYYY-MM-DD), or `null`
  if the announcement mentions no Prerelease.
- `isSpecialSet` — `false` when the announcement describes Prerelease tournaments
  (main sets ship with sleeved booster packs and have Prereleases); `true`
  otherwise (sub-sets / special sets without sleeved boosters have no Prerelease).
- `sourceUrl` — the `press.pokemon.com` announcement URL the dates came from.
- `fetchedAt` — current UTC time, ISO 8601.

## Procedure

### 1. Start from the current file and today's date

Read the existing `src/data/upcoming-sets.json` (if the file does not exist yet,
start from an empty array `[]` — the first run creates it). Get today's date:

```bash
date -u +%Y-%m-%d
```

**Drop any entry whose `releaseDate` is on or before today** — it has shipped and is
no longer "upcoming" (the snapshot workflow takes over from there).

### 2. Find announcements on press.pokemon.com

Fetch the TCG releases listing (`press.pokemon.com` is the only reachable host):

```bash
curl -sL 'https://press.pokemon.com/en/?itemtype=3'
```

The listing is paginated (`&page=2`, `&page=3`, …). Newly-announced sets are near
the top, so you rarely need to go far. Look for **set-announcement** press releases —
titles like "New Pokémon Trading Card Game: <Series>—<Set> … Coming Soon",
"First Expansion of New Pokémon Trading Card Game: …", etc. Ignore launch-day
"Available Now" / "Launches Today" alerts and non-expansion news (events, contests,
TCG Pocket, organized play).

### 3. Extract the dates from each announcement body

Open the announcement page and read the body. Find:
- the **physical release date** (phrased "available …", "launches …", "on sale …",
  or "Coming … on <date>");
- the **Prerelease start date** ("Prerelease tournaments … beginning <date>"), if
  any — its presence means `isSpecialSet: false`; its absence means `true`;
- ignore the Pokémon TCG Live date.

Press releases give dates in human form ("July 17, 2026"). Convert to `YYYY-MM-DD` —
do not eyeball; you may use the `date` CLI.

Only include sets whose release date is **strictly after today**. If an announcement
is ambiguous or you cannot find a clear physical release date, **do not guess** —
emit a `create-issue` safe-output describing the set and what you found, and skip it.

### 4. Write the file

Merge: keep the still-future existing entries (refresh their dates if the press
release now has better data) and add any newly-found upcoming sets. Set `setId` to
`null` on every entry (it is never known at this stage). De-duplicate by `name`. Sort
the array by `releaseDate` ascending. Write valid JSON with 2-space indentation and a
trailing newline. Set `fetchedAt` to the current UTC time on entries you add or update.

If there are no upcoming sets at all, write an empty array `[]`. A no-op run (file
unchanged) is fine — the workflow will simply not commit.

### 5. Open a setId-backfill reminder for each newly-added set

For every set you add that was **not** already present in the file, emit one
`create-issue` safe-output. The `setId` can't be known until the set releases, so
this issue is the reminder to check whether the API set ID is available yet and fill
it into `src/data/upcoming-sets.json` (done by hand). Only for **newly-added** sets —
first search existing issues for the set name and do **not** open a second issue for
a set already tracked (e.g. a later run that merely refreshes its dates). Use the
"setId backfill" issue format below.

## Hard rules

- The only file you may modify is `src/data/upcoming-sets.json`. Do not edit
  scripts, workflows, or other data files. The post-step validator fails the job on
  any other change.
- Only `press.pokemon.com` is reachable. If a fetch fails because of the hostname,
  fix the URL — do not report "missing tool" or "blocked by security policy"; the
  tooling is fine, the network restriction is on the host only.
- Do not report `missing_tool` for curl/wget. You have shell access (`bash: [":*"]`).
- Do not invent dates. Every date comes from the press release — read it, don't infer.
- Dates are `YYYY-MM-DD`. `sourceUrl` must be on `press.pokemon.com`.
- Before opening an issue, search existing issues for the set name to avoid duplicates.

## Issue format — setId backfill (one per newly-added set)

Title: `Backfill setId: <Set Name>`
Body:
- Set: series + name, releaseDate, prereleaseDate
- Why: `setId` is `null` until the set releases. Once it ships and appears in the
  card database (the snapshot workflow adds it on release day), fill the API set ID
  into the matching `src/data/upcoming-sets.json` entry — or just drop the entry if
  it has aged out.
- Source: the `press.pokemon.com` announcement URL

## Issue format — ambiguous announcement (when dates can't be read)

Title: `Ambiguous announcement: <Set Name>`
Body:
- Set: series + name as best you can tell
- The announcement URL(s) you read
- Which date was unclear (release / prerelease) and why
- Suggested next action
