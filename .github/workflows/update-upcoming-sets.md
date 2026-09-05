---
name: Update upcoming sets
on:
  workflow_dispatch:

permissions:
  contents: read
  issues: read
  pull-requests: read

engine:
  id: copilot
  model: gpt-5-mini

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
#   - the agent writes only a proposal file; a trusted post-step merges it into the
#     canonical upcoming-sets.json, and the validator fails on any other changed path
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
  noop:
    report-as-issue: false
  create-issue:
    max: 5
    title-prefix: "[upcoming-sets] "
    labels: [automation, upcoming-sets]

# After the agent finishes, validate and commit. Unlike the set-legality agent,
# a no-op run is legitimate here (no newly-announced set), so there is NO
# "fail if no diff" guard — the commit step simply skips when nothing changed.
post-steps:
  # The agent writes a *proposal* (upcoming-sets.proposed.json), never the canonical
  # file. This trusted step merges the proposal onto the current committed data and is
  # the only thing that writes upcoming-sets.json — it carries a hand-backfilled setCode
  # across and freezes fetchedAt on entries the agent didn't actually change, so the
  # agent cannot clobber human-owned data. Runs before the validator.
  - name: Merge agent proposal into upcoming-sets.json
    run: node scripts/merge-upcoming.mjs

  - name: Validate merged output
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

You **read** the current data from `src/data/upcoming-sets.json` and **write** your
result to `src/data/upcoming-sets.proposed.json` — a *proposal*. You never edit
`upcoming-sets.json` yourself; after you finish, a trusted merge step combines your
proposal with the current file and writes the canonical `upcoming-sets.json`. That
merge owns two things so you don't have to worry about them (details under `setCode`
and `fetchedAt` below): it carries a hand-backfilled `setCode` across, and it leaves
`fetchedAt` untouched on any entry whose other fields didn't change.

Both files are a **JSON array** (the set code isn't known before release, so entries
cannot yet be keyed by it). Each entry:

```json
{
  "setCode": null,
  "name": "Pitch Black",
  "series": "Mega Evolution",
  "releaseDate": "2026-07-17",
  "prereleaseDate": "2026-07-04",
  "isSpecialSet": false,
  "legalProductDate": null,
  "sourceUrl": "https://press.pokemon.com/en/releases/...",
  "fetchedAt": "2026-06-09T08:00:00Z"
}
```

- `setCode` — the set code printed on the card next to the collector number (e.g.
  `"CRI"`, `"SSP"`), the join key the app uses (the same `setCode` as deck cards; it
  is the API's `set.ptcgoCode`). It is hard to pin down before release (sometimes
  hinted in teaser images, but rarely published cleanly), so **always write `null`**
  and never guess it — it is a placeholder backfilled by hand later, and you open a
  tracking issue when you add a set (see step 5) so the backfill isn't forgotten. You
  do not need to preserve it: if a human already backfilled a set's code, the merge
  step carries that value across for you even though your proposal says `null`.
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
- `legalProductDate` — **special sets only** (`null` for main sets). The *earlier* of
  the set's Elite Trainer Box and Booster Bundle release dates (YYYY-MM-DD). This is the
  anchor for a special set's tournament-legal date (Handbook §4.1.2.1: special sets are
  legal two weeks after the earlier of ETB / Booster Bundle). Leave it `null` until you
  find a press release that lists those product dates — see step 3b. The app shows the
  legal date only once this is filled; a `null` here is not an error.
- `sourceUrl` — the `press.pokemon.com` announcement URL the dates came from. For a
  special set, prefer the **product-lineup** release you read `legalProductDate` from
  (see step 3b) over the earlier bare reveal — it is the better provenance for the date.
- `fetchedAt` — current UTC time, ISO 8601. Just set it to now on every entry in your
  proposal; you don't have to track which entries changed. The merge step compares your
  proposal against the current file and keeps the old `fetchedAt` on any entry whose
  other fields are unchanged, so an untouched set is never falsely re-stamped.

## Procedure

### 1. Start from the current file and today's date

Read the existing `src/data/upcoming-sets.json` for the current data (if the file does
not exist yet, start from an empty array `[]` — the first run creates it). You will
write your result to `src/data/upcoming-sets.proposed.json`, not this file. Get today's
date:

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
"First Expansion of New Pokémon Trading Card Game: …", etc.

Ignore releases whose **subject** is not a TCG expansion — contests, TCG Pocket, video
games, merchandise, and standalone event coverage (World Championships, tournament
results, Play! Pokémon season news). Judge the subject, not the vocabulary: an
expansion announcement *will* talk about Play! Pokémon and Prerelease tournaments, and
that organized-play content is exactly what you are here to read. Organized play
mentioned **inside a set announcement is signal**; a press release that is *only* about
organized play is not.

**Bound the listing by publication date.** Every row carries its publication date as
`M/D/YYYY` (e.g. `8/20/2026`). Page 1 alone currently reaches back more than half a
year, and anything announced long ago describes a set that has already shipped.
Announcements land ~10–11 weeks before release, so **skip any row published more than
120 days before today** without opening it.

**Skip launch-day alerts.** A title containing "Available Now", "Available Today" or
"Launches Today" announces a set that is shipping *that day* — it is never an upcoming
set. Skip it outright: do not open it, and do **not** file an ambiguity issue for it
(it has no future release date to find, so "no release date" is the expected result,
not a problem worth a human's time).

### 3. Extract the dates from each announcement body

Open the announcement page and read the body. Find:
- the **physical release date** (phrased "available …", "launches …", "on sale …",
  or "Coming … on <date>");
- the **Prerelease start date** ("Prerelease tournaments … beginning <date>"), if
  any — its presence means `isSpecialSet: false`; its absence means `true`;
- ignore the Pokémon TCG Live date.

**Read the body yourself — do not rely on a pattern-matching script.** It is fine to
use shell tooling to *fetch* the page and strip it down to readable text, but the
dates must be found by you reading that text. A regex that finds nothing means your
pattern was too narrow, not that the announcement is ambiguous.

### 3b. For a special set, find `legalProductDate` (earlier of ETB / Booster Bundle)

Only for entries where `isSpecialSet` is `true`. Main sets keep `legalProductDate: null`.

A special set's tournament-legal date is anchored to its accessory products, not its
headline release date, so you must find the **Elite Trainer Box** and **Booster Bundle**
street dates. These are usually in a **separate, later, more detailed press release** — a
"Product Lineup" / "Product Showcase" reveal — not the first bare "coming soon" reveal.
Search the listing for that release for this set (it may be published weeks after the
first announcement). Then:

- Read the product list and take the **earlier of the ETB and the Booster Bundle** release
  date. If only one of the two is listed, use that. Record it as `legalProductDate` and set
  `sourceUrl` to this release.
- If neither the ETB nor the Booster Bundle date is published anywhere yet, leave
  `legalProductDate: null` — do **not** substitute another product or the headline date, and
  do **not** file an issue for it. A scheduled gate re-dispatches this workflow every two
  weeks, so a later run will find the lineup release once it exists.

**Only the ETB and Booster Bundle count — ignore every other product.** Worked example
(Ascended Heroes): the Tech Sticker Collection released Jan 30, 2026, the ETB Feb 20, 2026,
the Booster Bundle April 24, 2026. The earliest *product* is the Tech Sticker Collection,
but it does **not** count — the binding anchor is the earlier of ETB/Booster Bundle, i.e.
the ETB on **Feb 20** (which gave a legal date of March 6). Do not pick the Tech Sticker,
Poster Collection, ex Box, Knock Out Collection, promo, or Pokémon TCG Live dates.

**The page is HTML, and the dates are littered with entities and tags.** Before
reading, strip tags and decode entities — bodies contain `&nbsp;` (often sitting
between a word and the date), `&mdash;` (the separator in "Mega Evolution&mdash;Delta
Reign"), `&eacute;`/`&#233;` (in "Pokémon"). A date can straddle a tag boundary, so
never match against the raw HTML.

**Dates are written by humans, so expect any human format.** These are *examples of
what has been seen*, not a list of what is allowed — handle every plausible way a
person might write a date, including forms not listed here:

| Example | |
| --- | --- |
| `November 6, 2026` | full month name |
| `Nov. 6, 2026` | abbreviated month, with a period |
| `Sept. 26, 2026` | four-letter abbreviation (Sept., not Sep.) |
| `24 October 2026` | day first, no comma |

Formats vary *within a single release*: the Delta Reign announcement gives its release
as "beginning Nov. 6, 2026" and its Prerelease as "taking place beginning 24 October
2026". If a date is written in some way none of these examples cover, read it and
convert it anyway — that is the whole reason a human-language agent does this job
instead of a script. Convert to `YYYY-MM-DD` — do not eyeball; you may use the `date`
CLI.

**A press release usually contains many dates, and most of them are not the ones you
want.** Work out what each date *refers to* from the sentence around it, rather than
taking the first or the earliest one. Dates that are commonly present and must **not**
be used as `releaseDate`:

- **Individual product availability** — "Elite Trainer Box (available Feb. 20, 2026)",
  "Booster Bundle (available April 24, 2026)". Accessory products ship on their own
  staggered dates, weeks or months after the expansion itself. (These are never
  `releaseDate` — but for a **special set** the earlier of the ETB/Booster-Bundle date
  is captured separately as `legalProductDate`; see step 3b.)
- **The Pokémon TCG Live date** — "players will be able to play … starting Nov. 5,
  2026, via the Pokémon TCG Live app". Digital, usually ~1 day before tabletop.
- **The publication date of the release itself** — the dateline at the top
  ("Aug. 20, 2026 — The Pokémon Company International announced today …").
- **Promotional deadlines** — battle pass expiry, event registration cut-offs.

`releaseDate` is the date the expansion itself reaches shops ("available at
participating retailers … beginning <date>"); `prereleaseDate` is when Prerelease
tournaments start. If two candidate sentences genuinely conflict about the tabletop
release date, treat the announcement as ambiguous rather than picking one.

Only include sets whose release date is **strictly after today**. If an announcement
is genuinely ambiguous or you cannot find a clear physical release date **after reading
the body text**, do not guess — emit a `create-issue` safe-output describing the set
and quoting the sentences you did find, and skip it.

### 4. Write the proposal file

Build the full array and write it to `src/data/upcoming-sets.proposed.json`: keep the
still-future existing entries (refresh their dates if the press release now has better
data — including filling a special set's `legalProductDate` once you find its
product-lineup release) and add any newly-found upcoming sets. Set `setCode` to `null`
on **every** entry (it is never known at this stage — the merge step restores a
human-backfilled code for you). Set `legalProductDate` to `null` on main sets and on
special sets whose ETB/Booster-Bundle date you could not find; otherwise to the date
from step 3b. Set `fetchedAt` to the current UTC time on every entry (the merge step
keeps the old value where nothing else changed). De-duplicate by `name`. Sort the array
by `releaseDate` ascending. Write valid JSON with 2-space indentation and a trailing
newline.

Write your proposal even when it is identical to the current data — always emit the
full array (or `[]` if there are no upcoming sets at all). The merge step diffs it
against the current file, so an unchanged proposal simply results in no commit.

### 5. Open a set-code-backfill reminder for each newly-added set

For every set you add that was **not** already present in the file, emit one
`create-issue` safe-output. The `setCode` (the set code on the card) is hard to find
this early (it sometimes surfaces in teaser images but isn't reliably published), so
this issue is the reminder to check whether the set code is available yet and fill it
into `src/data/upcoming-sets.json` (done by hand). Only for **newly-added** sets —
first search existing issues for the set name and do **not** open a second issue for a
set already tracked (e.g. a later run that merely refreshes its dates). Use the
"set code backfill" issue format below.

## Hard rules

- The only file you may write is `src/data/upcoming-sets.proposed.json`. Do **not** edit
  `src/data/upcoming-sets.json` directly (the merge step owns it), and do not edit
  scripts, workflows, or other data files. The post-step validator fails the job on any
  disallowed change.
- Only `press.pokemon.com` is reachable. If a fetch fails because of the hostname,
  fix the URL — do not report "missing tool" or "blocked by security policy"; the
  tooling is fine, the network restriction is on the host only.
- Do not report `missing_tool` for curl/wget. You have shell access (`bash: [":*"]`).
- Do not invent dates. Every date comes from the press release — read it, don't infer.
- Never conclude "no date found" from a failed regex alone. Strip the HTML to text and
  read it before you decide an announcement is ambiguous.
- Only file an ambiguity issue for a genuine *upcoming* set. Launch-day "Available Now"
  alerts and announcements older than 120 days are expected to have no future release
  date — skip them silently.
- Dates are `YYYY-MM-DD`. `sourceUrl` must be on `press.pokemon.com`.
- Before opening an issue, search existing issues for the set name to avoid duplicates.

## Issue format — set code backfill (one per newly-added set)

Title: `Backfill set code: <Set Name>`
Body:
- Set: series + name, releaseDate, prereleaseDate
- Why: `setCode` starts `null` — the set code (printed on the card) is hard to find
  this early (sometimes hinted in teasers, otherwise revealed around release). Once
  you can confirm the set code (e.g. the set appears in the card database — the
  snapshot workflow adds it on release day, and it's the first element of the
  `sets.json` tuples), fill it into the matching `src/data/upcoming-sets.json`
  entry — or just drop the entry if it has aged out.
- Source: the `press.pokemon.com` announcement URL

## Issue format — ambiguous announcement (when dates can't be read)

Title: `Ambiguous announcement: <Set Name>`
Body:
- Set: series + name as best you can tell
- The announcement URL(s) you read
- Which date was unclear (release / prerelease) and why
- **The sentences you did find**, quoted verbatim from the stripped body text, so a
  human can see what you were looking at without re-reading the page
- Suggested next action
