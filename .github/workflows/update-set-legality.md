---
name: Update set legality
on:
  workflow_dispatch:
    inputs:
      sets:
        description: 'JSON array of new sets: [{setId,name,releaseDate,ptcgoCode,isSpecialSet}]'
        required: true
        type: string

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

# Tools the agent can call. We give it broad shell access (`:*`) because
# Copilot CLI's prefix-matching on `--allow-tool 'shell(...)'` makes a
# fine-grained allow-list a whack-a-mole exercise — every flag combination
# the agent tries (`curl -s …`, `curl -sL …`, `curl --silent …`) needs its
# own prefix entry, and the previous attempts kept producing false "blocked
# by security policy" reports when the actual blocker was the harness, not
# the firewall.
#
# The real security boundaries that remain:
#   - network firewall: only press.pokemon.com is reachable (network.allowed)
#   - container: ephemeral, no persistent state
#   - env: COPILOT_GITHUB_TOKEN / GITHUB_MCP_SERVER_TOKEN excluded
#   - post-step validator: any diff outside src/data/set-legality.json
#     fails the job before the commit
tools:
  bash:
    - ":*"
  edit:
  github:
    allowed:
      - list_issues
      - search_issues
      - issue_read

# Declarative side-effects the agent can request. The runtime applies these
# with its own trusted credentials — the agent itself has no write/issue token.
safe-outputs:
  create-issue:
    max: 5
    title-prefix: "[set-legality] "
    labels: [automation, set-legality]

# After the agent finishes, validate and commit. The job fails loudly if:
#   - the agent touched any file other than src/data/set-legality.json
#   - the agent produced no diff at all (i.e. didn't actually do the work)
#   - validation rejects a malformed entry (bad date, disallowed host, etc.)
post-steps:
  - name: Fail if the agent produced no legality update
    run: |
      if git diff --quiet src/data/set-legality.json; then
        echo "::error::Agent finished without modifying src/data/set-legality.json — no legality entry was produced for the input sets." >&2
        exit 1
      fi
      echo "Detected legality changes:"
      git diff --stat src/data/set-legality.json

  - name: Validate agent output
    run: node scripts/validate-legality.mjs

  - name: Commit and push
    env:
      SNAPSHOT_PUSH_TOKEN: ${{ secrets.SNAPSHOT_PUSH_TOKEN }}
    run: |
      # gh-aw scrubs git credentials from the workspace before running the
      # agent so the agent can't push on its own. Re-attach SNAPSHOT_PUSH_TOKEN
      # via the remote URL so this trusted post-step can push.
      git config user.name "github-actions[bot]"
      git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
      git remote set-url origin "https://x-access-token:${SNAPSHOT_PUSH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
      git add src/data/set-legality.json
      git commit -m "chore: update set legality $(date -u +%Y-%m-%d)"
      git push origin "HEAD:${GITHUB_REF_NAME}"

# Use the same PAT as the snapshot workflow so pushes to main work.
checkout:
  token: ${{ secrets.SNAPSHOT_PUSH_TOKEN }}
---

# Update set legality (special sets only)

You maintain `src/data/set-legality.json` for the Brilliant Blender Pokémon TCG
deck builder. Wrong dates silently break deck validation for players, so be
careful and never guess.

This workflow is dispatched **only for special sets** — sets without sleeved
booster packs (e.g. `me2pt5` Ascended Heroes, `sv8pt5` Prismatic Evolutions).
Main sets are filled in by the snapshot workflow directly using the rule
`releaseDate + 14 days`; they never reach this agent.

## Input

The sets to process are passed in as JSON via `${{ inputs.sets }}`:

```json
${{ inputs.sets }}
```

Each entry has `{ setId, ptcgoCode, name, releaseDate, isSpecialSet }`. All
entries will have `isSpecialSet: true` — if any do not, that is a bug in the
snapshot workflow; open an issue and stop.

## Per-set procedure

For each set in the input:

### 1. Find the press release

Fetch the TCG releases listing from press.pokemon.com — use `curl` (or
any other HTTP client; you have full shell access):

```bash
curl -sL 'https://press.pokemon.com/en/?itemtype=3'
```

`press.pokemon.com` is the only host the firewall allows. Any other
hostname will fail at the network layer with a real connection error
(not a permission/tool error) — if you see that, the hostname is wrong,
not the tool.

Find a press release whose title or body matches the set name.

The listing is paginated. If you do not find the set on the first page,
follow the next-page link and keep going (e.g.
`curl -sL 'https://press.pokemon.com/en/?itemtype=3&page=2'`). Brand-new
sets are at the top; older sets need pagination. Do not give up after
one page. Look across multiple press releases for the same set — the
MEDIA-ALERT around release day is usually a brief reminder; the original
announcement weeks or months earlier has the full product list.

The press release URL goes into `sourceUrl`. If you cannot find a matching
press release after exhausting the listing, **do not guess** — emit a
`create-issue` safe-output describing the set and what you searched, and move
on to the next set. Do not write an entry for that set.

### 2. Find the ETB / Booster Bundle release date

The Play! Pokémon rule for sets without sleeved booster packs is: "Sets
that do not have Sleeved Booster Packs … will follow the same two-week
cadence based on the release date of the expansion's Elite Trainer Box
or Booster Bundle, whichever comes first."

From the press release(s) for this set, find the earliest of:
- the **Elite Trainer Box** release date, and
- the **Booster Bundle** release date.

If only one is listed, use that date. If neither is present in any press
release you can find for the set, open an issue rather than guessing.

Press releases give dates in human form, e.g. "May 22, 2026". Convert
that to `YYYY-MM-DD` before computing — do not eyeball.

### 3. Add 14 days using the `date` CLI

**Do not do date arithmetic by hand.** Use the `date` command:

```bash
date -u -d "2026-05-22 +14 days" +%Y-%m-%d
# -> 2026-06-05
```

The output is your `legalFrom` value. It must be on or after `releaseDate`
(the validator enforces this).

### 4. Edit the file

Open `src/data/set-legality.json` and add the new entry. Use exactly this
shape — extra fields, missing fields, or slash-formatted dates will fail
validation:

```json
{
  "<setId>": {
    "name": "<full set name, copy from input>",
    "releaseDate": "<YYYY-MM-DD, copy from input>",
    "isSpecialSet": true,
    "legalFrom": "<YYYY-MM-DD, output of `date -d`>",
    "sourceUrl": "<https://press.pokemon.com/... press release URL>",
    "fetchedAt": "<current UTC time in ISO 8601, e.g. 2026-05-25T08:00:00Z>"
  }
}
```

Preserve all existing entries — never delete or rename keys. The validator
rejects dropped entries.

## Hard rules

- The only file you may modify is `src/data/set-legality.json`. Do not edit
  scripts, workflows, or other data files.
- Only `press.pokemon.com` is reachable. If a fetch fails because of the
  hostname, fix the URL — do not report "missing tool" or "blocked by
  security policy"; the tooling is fine, the network restriction is on
  the host only.
- Do not report `missing_tool` for curl/wget/http access. You have shell
  access (`bash: [":*"]`). If a command genuinely won't run, retry
  with a different syntax before giving up.
- Do not invent dates. The ETB / Booster Bundle release dates come from
  the press release — read them, don't infer.
- Dates everywhere are `YYYY-MM-DD`. Slashes are rejected.
- Use `date -u -d "<base> +14 days" +%Y-%m-%d` for the arithmetic.
- `sourceUrl` must be on `press.pokemon.com`. Other hosts are rejected.
- Before opening an issue for a missing press release, search existing issues
  for the set name to avoid duplicates.

## Issue format (when the press release is missing or ambiguous)

Title: `Missing press release: <Set Name> (<setId>)`
Body:
- Set: name, setId, ptcgoCode, releaseDate
- Searched: pages you visited on press.pokemon.com
- Why no entry was written (no match found / ETB+Bundle dates not in any release / etc.)
- Suggested next action

The set will not be retried automatically — the snapshot workflow only
dispatches this workflow when a *newly added* special set appears. If an
issue is filed, a follow-up dispatch (manual) is needed to fill that set in
once the press release is available.
