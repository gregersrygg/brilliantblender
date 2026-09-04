# Component Interfaces

## `App.svelte`

Top-level flow controller. Three render states:
- `DeckInput` + `Features` + `Changelog` — empty state / landing page (no deck loaded)
- `DeckView` + `ExportButton` — deck loaded
- Error banner — top-level fetch failure

Also manages `PrintPicker` visibility.

**On mount:** if `window.location.hash` starts with `#deck=`, decodes the rest with `decodeURIComponent`, strips the hash via `history.replaceState`, and forwards the decoded text to `deckState.loadDeck()`. Malformed encoding falls through to the empty state with the hash still stripped. This is the entry point for cross-site deep links (see README "Linking to a deck from another site").

**Internal state:**
- `deckState` — result of `createDeck()` (see [state.md](state.md))
- `pickerCard: { name, setCode, number } | null` — which card's Print Picker is open; `null` = closed

**Key function:** `getPickerDeckCards(cardName)` — collects `[{ setCode, number, qty, setId }]` for all deck entries with that name (feeds `initialPrints` into PrintPicker, including entries at qty=0). `setId` is the API set id used for robust matching when `ptcgoCode` is ambiguous.

**Behavioural rule — logo animation runs a fixed 5s window:** the logo SVG's `blending` class (which drives the spin/pulse/sparkle CSS animations) is bound to `animating || deckState.loading`. `animating` is a local `$state` flag set true by `playLogoAnimation()`, which arms a 5s `setTimeout` (clearing any prior one so re-triggers restart a single clean window). `playLogoAnimation()` is called on mount, in `handleLoad()`, and in the `ConfirmDialog` reset handler. Intent: card data now resolves almost instantly from cached/bundled data, so tying the animation purely to `loading` made it flicker invisibly; the timer guarantees a visible run, while OR-ing in `loading` keeps it spinning through a genuinely slow fetch.

---

## `DeckInput.svelte`

**Props:** `{ onload: (text: string) → void }`

Textarea with placeholder + "Load Deck" button. Button disabled when textarea is empty.

---

## `CardSearch.svelte`

**Props:** `{ onadd: (card) → void }`

Search input that adds cards to the deck. Input is debounced (300ms) and ignored under 2 chars; results come from `searchCards()` and are filtered to legal regulation marks (basic Energy always allowed). Selecting a result calls `onadd` and clears the query.

Results render as a **responsive grid of card images** (`.search-results`) rather than a list — the grid auto-fills as many columns as fit (~4-up on desktop, ~2-up under 640px), so it uses the full width on wide screens. Each result (`.search-result`) is the card image with a supertype badge (P/T/E) overlaid in the corner and a centered caption below: name (`.result-name`) + set code/number. The input is 16px to avoid iOS focus-zoom (see architecture.md → Mobile zoom behaviour).

**Behavioural rule — dismissing the results dropdown must not be tied to input blur.** The dropdown (`open` state) closes on: result selection, `Escape`, the query dropping under 2 chars, the clear (✕) button, or a `pointerdown` *outside* the component root (`rootEl`, tracked by a `$effect`-scoped document listener). It deliberately does **not** close on the input's `blur`/`focusout` — on iOS, dismissing the on-screen keyboard blurs the input, and closing on blur would hide the results the user just freed up screen space to read (issue #33). The `.search-clear` (✕) button, shown whenever there's a query, is the always-visible affordance for dismissing results on touch where there's no `Escape` key and little tappable space outside the panel.

---

## `Features.svelte`

No props. Static "Why Brilliant Blender?" section shown on the landing page (empty state only). A 3-up grid of differentiators (print swapping, tournament-legality checks, instant/offline/private). Edit the `features` array in-component to change copy. Collapses to a single column under 640px.

---

## `Changelog.svelte`

No props. "What's new" section shown on the landing page (empty state only). Renders entries from `src/lib/changelog.js` (`CHANGELOG`), newest first, each with a locale-formatted date and a bullet list of user-facing changes. **Add a `CHANGELOG` entry whenever you ship something a user would notice** — keep it player-focused, not internal/CI churn. Dates are `YYYY-MM-DD` strings parsed as local dates to avoid timezone drift.

---

## `DeckView.svelte`

**Props:** `{ sections, onincrement, ondecrement, warnings: Map<name, string>, onpick: fn|null, onremove: fn|null }`

Renders one `<section>` per deck section with a header (`name (count)`) and a CSS grid of `CardTile` components. Passes `onpick` only to Pokémon section tiles (`section.name === 'Pokémon'`); Trainer/Energy tiles receive `onpick={null}` (not clickable).

Visible cards: `section.cards.filter(c => c.qty > 0 || c.error)` — zero-qty cards are hidden but not removed.

---

## `CardTile.svelte`

**Props:** `{ card, onincrement, ondecrement, warning: string|null, onpick: fn|null, onremove: fn|null }`

Three render states:
1. **Loading** (`card.cardLoading`) — skeleton placeholder with pulse animation, aspect ratio 245/342
2. **Error** (`card.cardError`) — warning icon + card name text on skeleton background
3. **Loaded** — card image, qty badge (top-left overlay), +/− buttons below, optional warning text

When `onpick` is provided, the image is wrapped in `<button class="pick-trigger">` calling `onpick(card)`. Otherwise a plain `<img>`. DeckView controls which cards get `onpick`.

When `onremove` is provided, error-state tiles show a `×` button (top-right corner) that calls `onremove(card)` to remove the card from the deck entirely.

**Warning/notice text** (shown below the qty controls for `qty > 0`, first match wins).
Red errors take precedence over the amber notice — `hasError = warning || (isRotating && qty>0)`
and `showNotice = notLegalUntil && qty>0 && !hasError`, so a card that is both not-yet-legal
and rule-violating shows only the red error (and only the `.card-warning` border, never `.card-notice`):
1. `card.isRotating` → red `Not Standard-legal` (red `.card-warning` border).
2. `warning` prop (count/ACE SPEC rule) → red text (red `.card-warning` border).
3. `showNotice` → **amber** `Legal from {formatLegalDate(date)}` (`.warning-text.notice`, amber `.card-notice` border) — informational, the card is valid but its set isn't tournament-legal yet. Suppressed for functionally-identical reprints of already-legal cards (legal on release, Handbook §4.1.3 — see [state.md](state.md)).

**data-testid attributes:** `card-tile`, `increment`, `decrement`

---

## `PrintPicker.svelte`

**Props:** `{ cardName, clickedSetCode, clickedNumber, initialPrints, onclose }`

- `initialPrints`: `[{ setCode, number, qty, setId }]` — current deck quantities per print of this card name
- `clickedSetCode` / `clickedNumber` — which print was clicked (pre-selected in detail panel, highlighted with `.current`)
- `onclose(prints)` — called with the picker's full print array on Done; called with `null` on Cancel/backdrop click

**On mount:** calls `fetchPrintsByName(cardName)`, filters to Standard-legal prints only, then merges with `initialPrints`.

**Regulation filtering:** Only prints with `regulationMark` in `LEGAL_REGULATION_MARKS` (from `config.js`) are shown. Exception: older prints that are **functional reprints** of a legal card (same HP, same attacks by name/cost/damage/text, same abilities by name/text — via `isFunctionalReprint` in [`reprint.js`](../../src/lib/reprint.js), shared with the deck legality logic) are also included.

**Each `pickerPrint` entry:** `{ setCode, setId, number, setName, image, largeImage, legalities, isBasicEnergy, isAceSpec, regulationMark, hp, supertype, attacks, abilities, qty }`.

**Qty matching:** uses `setId` (API set id) for matching when available; falls back to `setCode` (ptcgoCode). Handles edge cases where PTCGL code ≠ API ptcgoCode.

**Validation on Done:** total qty across all prints > 4 (and no print `isBasicEnergy`) → shows `data-testid="picker-error"`, blocks close.

**Layout:** Full-screen modal (`inset: 0`). Two columns on desktop: left list (380px, scrollable) + right detail panel (flex-1). Clicking a list item sets `selectedPrint` and shows the large card image, HP, abilities, attacks, and set info in the detail panel. Mobile (≤700px): tab bar to switch between "Prints" list and "Details" panel.

**data-testid attributes:** `print-picker`, `print-option` (one `<li>` per print), `print-increment`, `print-decrement`, `print-qty`, `picker-error`

**Classes on `print-option`:** `.current` = matches `clickedSetCode + clickedNumber`; `.selected` = currently shown in detail panel.

---

## `ExportButton.svelte`

**Props:** `{ onexport: () → string }`

Button labelled "Export Decklist". On click: calls `onexport()`, copies result to clipboard via `navigator.clipboard.writeText()`. Shows "Copied!" for 2 seconds then reverts.

---

## `ConfirmDialog.svelte`

**Props:** `{ onconfirm: () → void, oncancel: () → void }`

Full-screen backdrop + centered dialog. Heading: "Start over?". Body: "Your current deck will be lost." Two buttons: Cancel (calls `oncancel`) and Confirm (calls `onconfirm`). Clicking the backdrop calls `oncancel`. Uses `role="alertdialog"` with `aria-modal="true"` and `aria-labelledby="dialog-title"`.

---

## `parser.js` — `parseDeck(text)`

`parseDeck(text) → { sections: Section[], totalCount: number }`

Section header regex: `/^(Pokémon|Pokemon|Trainer|Energy)\s*:\s*(\d+)/i`

Card line regex: `/^(\d+)\s+(.+?)\s+(<set code>)\s+(\d+)\s*$/` → `{ qty, name, setCode, number }`

The set-code part (`SET_CODE_RE`) is `(?=[A-Za-z0-9]{0,5}[A-Za-z])[A-Za-z0-9]{2,6}(?:-[A-Za-z0-9]{1,3})?`:
2–6 alphanumerics with an optional `-XX` promo suffix (`PR-SV`). Codes may start with a
digit — 30th Celebration is `30C` — so the leading lookahead is what carries the intent:
the code must contain **at least one letter**, which is the only thing separating it from
the collector number that follows. Do not tighten it back to letters-only; digit-leading
codes then fall through to the "unrecognized line" stub and never reach the upcoming-set
"coming soon" handling.

Unrecognized lines produce a card stub with `error: true` (rendered with warning icon, skipped in API fetches and export).
