---
name: Update set legality
on:
  workflow_dispatch:
    inputs:
      sets:
        description: 'JSON array of new sets: [{setId,name,releaseDate,ptcgoCode}]'
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

# Tools the agent can call. The combination of:
#   - bash limited to read-only commands + the date CLI for arithmetic
#   - no `git` / no `gh`
#   - write-tool diff enforced by the post-job validator
# means the agent's only durable effect is editing src/data/set-legality.json.
tools:
  bash:
    - "cat src/data/set-legality.json"
    - "jq"
    - "test"
    - "ls src/data"
    - "date"
    # Embedded space prevents gh-aw from treating curl as a stem command and
    # appending `:*` (which Copilot CLI then fails to prefix-match against
    # `curl https://...`). The space-form passes through verbatim and Copilot
    # prefix-matches it, allowing only curl calls to press.pokemon.com — which
    # is also the only host the firewall permits.
    - "curl https://press.pokemon.com"
  edit:
  web-fetch:
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

# After the agent finishes, validate and commit. If validation rejects (e.g. the
# agent touched any file other than src/data/set-legality.json, or wrote a bad
# date), the job fails loudly and nothing is pushed.
post-steps:
  - name: Validate agent output
    run: node scripts/validate-legality.mjs

  - name: Commit and push if changed
    run: |
      if git diff --quiet src/data/set-legality.json; then
        echo "No legality changes"
        exit 0
      fi
      git config user.name "github-actions[bot]"
      git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
      git add src/data/set-legality.json
      git commit -m "chore: update set legality $(date -u +%Y-%m-%d)"
      git push

# Use the same PAT as the snapshot workflow so pushes to main work.
checkout:
  token: ${{ secrets.SNAPSHOT_PUSH_TOKEN }}
---

# Update set legality

You maintain `src/data/set-legality.json` for the Brilliant Blender Pokémon TCG
deck builder. Wrong dates silently break deck validation for players, so be
careful and never guess.

## Input

The set or sets to process are passed in as JSON via `${{ inputs.sets }}`:

```json
${{ inputs.sets }}
```

Each entry has `{ setId, ptcgoCode, name, releaseDate }` and `releaseDate` is
already normalized to `YYYY-MM-DD`. Process every set in the input. Do nothing
for sets not in the input — historical data is out of scope for this run.

## Per-set procedure

For each set in the input:

### 1. Find the press release

Fetch the TCG releases listing with `curl`:

```bash
curl -sL 'https://press.pokemon.com/en/?itemtype=3'
```

`press.pokemon.com` is the only host the firewall allows — any other
hostname will be blocked at the network layer, so do not waste time
trying alternatives. Find a press release whose title or body matches
the set name.

The listing is paginated. If you do not find the set on the first page,
follow the next-page link and keep going (e.g.
`curl -sL 'https://press.pokemon.com/en/?itemtype=3&page=2'`). Brand-new
sets are at the top; older sets need pagination. Do not give up after
one page.

The press release URL goes into `sourceUrl`. If you cannot find a matching
press release after exhausting the listing, **do not guess** — emit a
`create-issue` safe-output describing the set and what you searched, and move
on to the next set. Do not write an entry for that set.

### 2. Classify special vs main

Read the press release product list:

- `isSpecialSet: false` (main set) — the press release lists **Booster Boxes**
  *or* **Sleeved Booster Packs** as products.
- `isSpecialSet: true` (special set) — the press release lists no booster
  boxes and no sleeved booster packs. Typical products: Elite Trainer Box,
  Booster Bundle, premium collection, special collection.

### 3. Determine the base date for the +14-day cadence

Both kinds of set become legal **14 days** after a base date. Only the base
date differs:

- **Main set** — base date is `releaseDate` (the set's release date from the
  input).
- **Special set** — base date is the earlier of the **Elite Trainer Box
  release date** and the **Booster Bundle release date** as listed in the
  press release. (This matches the rule: "Sets that do not have Sleeved
  Booster Packs … will follow the same two-week cadence based on the release
  date of the expansion's Elite Trainer Box or Booster Bundle, whichever comes
  first.") If only one of the two is listed, use that date. If neither is
  present in the press release, treat the press release as ambiguous and open
  an issue rather than guessing.

Press releases give dates in human form, e.g. "May 22, 2026". Convert that to
`YYYY-MM-DD` before computing — do not eyeball.

### 4. Add 14 days using the `date` CLI

**Do not do date arithmetic by hand.** Use the `date` command:

```bash
date -u -d "2026-05-22 +14 days" +%Y-%m-%d
# -> 2026-06-05
```

The output is your `legalFrom` value. It must be on or after `releaseDate`
(the validator enforces this).

### 5. Edit the file

Open `src/data/set-legality.json` and add the new entry. Use exactly this
shape — extra fields, missing fields, or slash-formatted dates will fail
validation:

```json
{
  "<setId>": {
    "name": "<full set name>",
    "releaseDate": "<YYYY-MM-DD, copy from input>",
    "isSpecialSet": <true|false>,
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
- Use `curl` to access press.pokemon.com. The firewall only allows that
  one host; any other URL will fail at the network layer. If `curl`
  itself fails (HTTP error, timeout), retry once, then open an issue
  describing the URL and the error — do not report "missing tool".
- Do not invent dates. The `releaseDate` from the input is authoritative
  (sourced from the TCG API). For special sets, the ETB / Booster Bundle
  release dates come from the press release — read them, don't infer.
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
- Why no entry was written (no match found / ETB+Bundle dates not in release / etc.)
- Suggested next action

The set will not be retried automatically — the snapshot workflow only
dispatches this workflow when a *newly added* set appears. If an issue is
filed, a follow-up dispatch (manual) is needed to fill that set in once the
press release is available.
