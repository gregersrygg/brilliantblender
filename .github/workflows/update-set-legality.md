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
    - www.pokemon.com
    - pokemon.com
    - community.pokemon.com

# Tools the agent can call. The combination of:
#   - bash limited to read-only commands
#   - no `git` / no `gh`
#   - write-tool diff enforced by the post-job validator
# means the agent's only durable effect is editing src/data/set-legality.json.
tools:
  bash:
    - "cat src/data/set-legality.json"
    - "jq:*"
    - "test:*"
    - "ls src/data"
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

Each entry has `{ setId, ptcgoCode, name, releaseDate }`. Process every set in
the input. Do nothing for sets not in the input — historical data is out of
scope for this run.

## Per-set procedure

For each set in the input:

1. **Find the press release.** Search `https://press.pokemon.com/en/?itemtype=3`
   (the TCG releases filter) for a release whose title or body matches the set
   name. The press release URL goes into `sourceUrl`. If you cannot find a
   matching press release after a thorough search, **do not guess** — emit a
   `create-issue` safe-output describing the set and what you searched, and
   move on to the next set. Do not write an entry for that set.

2. **Classify special vs main.** Read the press release product list. A set is
   `isSpecialSet: false` (main set) when the press release lists **booster
   boxes** or **sleeved booster packs** as products. A set is
   `isSpecialSet: true` when the press release lists only collection boxes,
   ETBs, premium collections, special sets, or similar — i.e. no booster
   boxes/packs.

3. **Determine `legalFrom`.** Fetch the current Play! Pokémon legality rules
   from `https://community.pokemon.com/en-us/discussion/22216/pokemon-tcg-product-legality-update`
   and apply them to this set:
   - Main set (booster boxes/packs): legal **14 days after** `releaseDate`.
   - Special set (no booster boxes/packs): apply the special-set rule from
     that announcement. Read it fresh each run; do not hardcode from memory,
     the rule may change again.

   Compute `legalFrom` in `YYYY-MM-DD`. It must be on or after `releaseDate`.

4. **Edit the file.** Open `src/data/set-legality.json` and add the new entry.
   Use exactly this shape — extra fields will fail validation:

   ```json
   {
     "<setId>": {
       "name": "<full set name>",
       "releaseDate": "<copy from input, YYYY/MM/DD>",
       "isSpecialSet": <true|false>,
       "legalFrom": "<YYYY-MM-DD>",
       "sourceUrl": "<https://press.pokemon.com/... press release URL>",
       "fetchedAt": "<current UTC time, ISO 8601, e.g. 2026-05-25T08:00:00Z>"
     }
   }
   ```

   Preserve all existing entries — never delete or rename keys. The validator
   rejects dropped entries.

## Hard rules

- The only file you may modify is `src/data/set-legality.json`. Do not edit
  scripts, workflows, or other data files.
- Do not invent dates. The `releaseDate` from the input is authoritative
  (sourced from the TCG API).
- One `sourceUrl` per entry. Prefer the pokemon.com press release over
  community posts.
- Before opening an issue for a missing press release, search existing issues
  for the set name to avoid duplicates.

## Issue format (when a press release cannot be found)

Title: `Missing press release: <Set Name> (<setId>)`
Body:
- Set: name, setId, ptcgoCode, releaseDate
- Searched: list of URLs you fetched
- What you found / didn't find
- Suggested next action

The set will not be retried automatically — the snapshot workflow only
dispatches this workflow when a *newly added* set appears. If an issue is
filed, a follow-up dispatch (manual or after a future snapshot quirk) will be
needed to fill that set in.
