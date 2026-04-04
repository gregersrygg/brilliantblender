# Brilliant Blender — Product Requirements Document

**Version:** 1.0  
**Date:** April 2026  
**Status:** Draft

---

## 1. Overview

### 1.1 Product Summary
Brilliant Blender is a free, client-side static web app that helps Pokémon TCG players convert a reference tournament decklist into a personalized, tournament-legal decklist using the cards they actually own. It is hosted on GitHub Pages and accessed via a custom domain (not decided).

### 1.2 Problem Statement
Competitive players routinely copy top-performing decklists from sources like Limitless TCG or Pokémon TCG Live. In IRL tournaments, the exact card print in the submitted decklist must match the physical card you bring — but players often own a functionally identical reprint with a different set code and number. No existing tool makes it easy to:
- Visualise a decklist with card images
- Quickly find alternate prints of any card
- Swap a card to a different print
- Export the adjusted list in tournament-legal format

Existing tools (Limitless, pkmn.gg, PokemonCard.io) cover parts of this workflow but none solve the substitution problem in an integrated, frictionless way.

### 1.3 Target User
A Pokémon TCG player preparing for a local or regional IRL tournament who:
- Has a reference decklist (from Limitless, PTCGL export, or a friend)
- Needs to submit a decklist that exactly reflects the prints they physically own
- May want to make a few card swaps or quantity adjustments

---

## 2. Goals & Non-Goals

### Goals
- Import a decklist in standard PTCGL text format
- Display card images for every card in the deck
- Allow Pokémon cards to be swapped to a different print of the same card - other types of cards where it's not needed to specify the right print should disallow swapping, and indicate why to the user with link to judge handbook or similar
- Allow quantity adjustments (+/-)
- Validate the right number of cards according to the rules
- Export the final decklist in standard PTCGL text format
- Work entirely client-side (no backend, no login, no server costs)
- Clean, fast, mobile-friendly UI

### Non-Goals (v1)
- Collection tracking / "cards I own" management
- Deck building from scratch
- Price lookup or purchase links
- Saving / sharing decklists
- Playtesting
- Expanded or Unlimited format support (Standard only, for now)
- Authentication or user accounts

---

## 3. Technical Foundation

### 3.1 Hosting
- **GitHub Pages** (free, static, custom domain via CNAME)
- Single `index.html` + JS + CSS — no build step required for early milestones

### 3.2 Card Data API
**pokemontcg.io v2 REST API**
- Base URL: `https://api.pokemontcg.io/v2`
- No API key required to start (1,000 req/day per IP, sufficient for early usage)
- Key endpoints:
  - `GET /v2/cards?q=name:"Nest Ball"` — find all prints of a card by name
  - `GET /v2/cards/{id}` — fetch a specific card by set-code + number (e.g. `sv3pt5-181`)
  - `GET /v2/cards?q=name:"Nest Ball" legalities.standard:legal` — Standard-legal prints only
- Card objects include: `id`, `name`, `supertype`, `set.id`, `set.name`, `set.ptcgoCode`, `number`, `images.large`, `images.small`, `rules`, `attacks`, `abilities`, `legalities`
- The `set.ptcgoCode` + `number` fields map directly to the standard decklist text format

### 3.3 Standard Decklist Format
PTCGL export format, used by Limitless, RK9, and tournament submissions:
```
Pokémon: 12
4 Gardevoir ex SVI 86
2 Kirlia SIT 68
...

Trainer: 38
4 Nest Ball SVI 181
...

Energy: 10
10 Psychic Energy SVE 5

Total Cards: 60
```
Fields per line: `{quantity} {name} {setCode} {number}`

---

## 4. UX Principles

- **One task at a time.** The UI should guide the user through a linear flow: Import → Review & Edit → Export.
- **Cards are the content.** Card images should be prominent, not tucked away.
- **Minimal chrome.** No sidebars, modals stacked on modals, or dense controls. Actions appear contextually.
- **No dead ends.** Every state has a clear next action.
- **Fast first.** Prefer small card thumbnails that load quickly; large image on hover/tap.

---

## 5. Milestones

Each milestone delivers a **fully working vertical slice** — something a real user can open in a browser and use end-to-end.

---

### Milestone 1 — Paste & Preview
**Goal:** A user can paste a decklist and immediately see card images.

**User Story:**  
> "I copied a decklist from Limitless. I want to see all the cards visually so I know what I'm working with."

**Scope:**
- A single-page app with a large text area: *"Paste your decklist here"*
- A **Load Deck** button
- Parser reads the standard PTCGL format, extracts `{qty} {name} {setCode} {number}` per line, groups into Pokémon / Trainer / Energy sections
- For each unique card, fetch from `api.pokemontcg.io/v2/cards/{setCode}-{number}` (or fall back to name search if not found by ID)
- Display cards in a clean grid, grouped by section, showing:
  - Card image (thumbnail)
  - Quantity badge
  - Card name + set/number below
- Loading states (skeleton cards while fetching)
- Basic error handling for unrecognised cards (show name as text with a warning icon)
- **Export button** that re-emits the original decklist text (round-trip test)
- All features validated with clean playwright tests

**Definition of Done:**  
User pastes a real Limitless decklist → sees all card images in ~5 seconds → Export produces valid text output.
All tests are passing.

---

### Milestone 2 — Quantity Editing
**Goal:** A user can adjust card quantities directly in the visual deck view.

**User Story:**  
> "I want to run 3 copies of this card instead of 4, and add a copy of something else."

**Scope:**
- Each card in the grid gets `−` / `+` quantity controls
- Quantity can go down to 0 (card disappears from deck) or up to 4
- Running card count shown per section and as a deck total (e.g. "60 / 60")
- Deck total turns red if not exactly 60
- Export reflects adjusted quantities
- No API calls needed for this milestone — purely UI state
- All features validated with clean playwright tests

**Definition of Done:**  
User can change a quantity, see the deck total update live, and export a decklist with the adjusted counts.
All tests are passing.

---

### Milestone 3 — Print Substitution
**Goal:** The core feature. A user can swap any card to a different print.

**User Story:**  
> "I have Nest Ball from a different set than the reference list. I need to find my version and swap it in."

**Scope:**
- Clicking/tapping a card opens a **Print Picker** panel (slides in from the right on desktop, bottom sheet on mobile)
- Print Picker shows all known prints of that card name in English, fetched from: `GET /v2/cards?q=name:"{exact name}"&orderBy=set.releaseDate`
- Each alternate print shows: card image, set name, set code + number, and a legality badge (Standard / Expanded / Unlimited)
- Each alternate card image should have `-` / `+` quantity controls
- Overflowing 4 cards with same text should be allowed during the swapping, but not closing the panel with more than 4 of a card (all print variants)
- Changing all alternate prints to 0 should not delete the card from the deck before the panel is closed
- Current print is highlighted in the picker
- Export uses the new print's set code and number
- All features validated with clean playwright tests

**Definition of Done:**  
User opens Print Picker for Nest Ball, sees all prints, selects a different one, and the exported decklist reflects the correct set code and number for the substituted print.
Tests are passing.

---

### Milestone 4 — Polish & Deploy
**Goal:** Production-ready quality. App is live at the custom domain.

**Scope:**
- Visual design pass: cohesive colour palette, typography, card hover states, smooth transitions
- Responsive layout tested on mobile (phone-size)
- "New Deck" / reset flow
- Empty state (landing state before any deck is loaded — explain what the tool is in 1–2 sentences)
- Error states: API down, card not found, malformed decklist lines
- Request batching / caching to reduce API calls (cache card data in `sessionStorage` to avoid re-fetching the same card on re-imports)
- `CNAME` file added to repo for custom domain
- README with deployment instructions
- Basic meta tags (`og:title`, `og:description`, favicon)
- All features validated with clean playwright tests

**Definition of Done:**  
App is live at `brilliantblender.gg` (or equivalent), handles all edge cases gracefully, and feels polished enough to share with the Pokémon TCG community.
Tests are passing.

---

## 6. API Usage Notes

### Card ID Resolution
The standard decklist format uses `{ptcgoCode} {number}` (e.g. `SVI 181`). The API uses `{setId}-{number}` (e.g. `sv1-181`). A mapping between `ptcgoCode` and `setId` is needed.

**Strategy:** On first load, fetch all sets once: `GET /v2/sets?pageSize=250` and cache in `sessionStorage`. Build a lookup map `ptcgoCode → setId`. This uses 1 API call for the full set list, then card fetches use the resolved IDs.

### Rate Limit Awareness
- Without a key: 1,000 req/day per IP
- A 60-card deck requires at most 60 card fetches + 1 set list fetch = 61 requests
- Print Picker adds ~1 request per card lookup (cached after first open)
- For a solo user, this is well within limits
- If usage grows, add a free API key (20,000 req/day) — the key can be embedded in the static JS since it only controls rate limits, not sensitive data

### Caching Strategy
- Set list: `sessionStorage` on first page load
- Individual cards: `sessionStorage` keyed by card ID
- Alternate prints per card name: `sessionStorage` keyed by name

---

## 7. Out-of-Scope for v1 (Future Considerations)

- **Collection tracking:** Mark which prints you own; auto-highlight substitution candidates
- **Deck builder from scratch:** Search and add cards without importing
- **Sharing:** Shareable URL with deck encoded in hash/query params (no backend needed — could use URL encoding)
- **Price overlay:** Show TCGPlayer/Cardmarket prices per print in the Print Picker
- **Expanded format:** Toggle to show Expanded-legal prints in the picker
- **Saved decks:** IndexedDB or localStorage to persist multiple decklists between sessions
- **API key config:** Let power users paste their own API key for higher limits