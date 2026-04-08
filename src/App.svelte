<script>
  import DeckInput from './lib/DeckInput.svelte';
  import DeckView from './lib/DeckView.svelte';
  import ExportButton from './lib/ExportButton.svelte';
  import PrintPicker from './lib/PrintPicker.svelte';
  import ConfirmDialog from './lib/ConfirmDialog.svelte';
  import CardSearch from './lib/CardSearch.svelte';
  import { createDeck } from './lib/deck.svelte.js';

  const deckState = createDeck();
  let pickerCard = $state(null); // { name, setCode, number } | null
  let showConfirm = $state(false);
  let dismissedParseWarning = $state(false);

  let parseErrorCount = $derived(
    deckState.deck
      ? deckState.deck.sections.flatMap((s) => s.cards).filter((c) => c.error).length
      : 0
  );

  function handleLoad(text) {
    dismissedParseWarning = false;
    deckState.loadDeck(text);
  }

  function handlePick(card) {
    pickerCard = { name: card.name, setCode: card.setCode, number: card.number };
  }

  function getPickerDeckCards(cardName) {
    if (!deckState.deck) return [];
    const result = [];
    for (const section of deckState.deck.sections) {
      for (const card of section.cards) {
        if (card.name === cardName && !card.error) {
          result.push({ setCode: card.setCode, number: card.number, qty: card.qty, setId: card.setId ?? null });
        }
      }
    }
    return result;
  }

  function handlePickerClose(prints) {
    if (prints !== null && pickerCard) {
      deckState.applyPrintPicker(pickerCard.name, prints);
    }
    pickerCard = null;
  }
</script>

<header class="app-header">
  <div class="brand">
    <svg class="logo-img" class:blending={deckState.loading}
      width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="Brilliant Blender logo">
      <defs>
        <linearGradient id="bb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#23c4ff"/>
          <stop offset="100%" stop-color="#7a4dff"/>
        </linearGradient>
        <linearGradient id="bb-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#d9f3ff" stop-opacity="0.75"/>
        </linearGradient>
        <linearGradient id="bb-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#253046"/>
          <stop offset="100%" stop-color="#111827"/>
        </linearGradient>
        <filter id="bb-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
        </filter>
      </defs>
      <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bb-bg)"/>
      <path class="sparkle sparkle-1" d="M17 20l2.2 5.8L25 28l-5.8 2.2L17 36l-2.2-5.8L9 28l5.8-2.2L17 20z" fill="#ffffff" opacity="0.9"/>
      <path class="sparkle sparkle-2" d="M63 14l1.4 3.6L68 19l-3.6 1.4L63 24l-1.4-3.6L58 19l3.6-1.4L63 14z" fill="#ffffff" opacity="0.75"/>
      <path class="sparkle sparkle-3" d="M61 56l1.8 4.8L67.5 63l-4.7 1.8L61 69.5l-1.8-4.7L54.5 63l4.7-2.2L61 56z" fill="#ffffff" opacity="0.75"/>
      <g filter="url(#bb-shadow)">
        <rect x="27" y="16" width="26" height="6" rx="3" fill="#dbe4f0"/>
        <rect x="31" y="13" width="18" height="5" rx="2.5" fill="#f8fafc"/>
        <path d="M29 22h22l-3.5 22a4 4 0 0 1-4 3.4h-7a4 4 0 0 1-4-3.4L29 22z" fill="url(#bb-glass)" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.2"/>
        <path class="liquid" d="M34 35c4-4 11-4 14 0 1.3 1.6.8 4-1.5 5.2-2.1 1.1-5.5 1.4-8.6.9-4.7-.7-6.3-3.6-3.9-6.1z" fill="#7dd3fc" opacity="0.9"/>
        <path d="M36 33c2.6-1.7 6.9-1.7 9.2.5" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>
        <path class="blade" d="M40 38.5l3.5-2.2-1 3.6 3.4 1.2-3.8.7-1 3.7-1-3.7-3.8-.7 3.4-1.2-1-3.6 3.3 2.2z" fill="#ffffff" opacity="0.9"/>
        <rect x="24" y="47" width="32" height="17" rx="8.5" fill="url(#bb-base)"/>
        <circle cx="40" cy="55.5" r="5.2" fill="#0f172a" stroke="#93c5fd" stroke-width="1.2"/>
        <circle cx="40" cy="55.5" r="1.6" fill="#e5e7eb"/>
        <path d="M40 55.5l2.6-2.1" stroke="#e5e7eb" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="30" cy="55.5" r="2.2" fill="#22d3ee"/>
        <circle cx="50" cy="55.5" r="2.2" fill="#a78bfa"/>
      </g>
      <rect x="4" y="4" width="72" height="72" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.22"/>
    </svg>
    <span class="wordmark">Brilliant Blender</span>
  </div>
  {#if deckState.deck}
    <div class="header-actions">
      <span class="deck-total" class:invalid={deckState.deckTotal !== 60}>
        {deckState.deckTotal} / 60
      </span>
      <button class="btn-outline" onclick={() => (showConfirm = true)}>New Deck</button>
      <ExportButton onexport={() => deckState.exportDeck()} />
    </div>
  {/if}
</header>

<main>
  {#if deckState.error}
    <div class="error-banner" role="alert">
      <p>Couldn't load cards — check your connection and try again.</p>
      <button onclick={() => deckState.reset()}>Try Again</button>
    </div>
  {:else if deckState.deck}
    {#if deckState.loading}
      <div class="deck-loading" role="status" aria-label="Loading cards…">
        <div class="deck-loading-bar"></div>
      </div>
    {/if}
    {#if parseErrorCount > 0 && !dismissedParseWarning}
      <div class="parse-warning" role="alert" data-testid="parse-warning">
        {parseErrorCount} line(s) couldn't be parsed and were skipped. Expected format:
        <code>4 Gardevoir ex SVI 86</code>
        <button onclick={() => (dismissedParseWarning = true)} aria-label="Dismiss">✕</button>
      </div>
    {/if}
    <CardSearch onadd={deckState.addCard} />
    <DeckView
      sections={deckState.deck.sections}
      onincrement={deckState.incrementCard}
      ondecrement={deckState.decrementCard}
      warnings={deckState.getWarnings()}
      onpick={handlePick}
      onremove={deckState.removeCard}
    />
  {:else}
    <DeckInput onload={handleLoad} />
  {/if}
</main>

<footer>
  <p>Brilliant Blender is an independent fan tool and is not affiliated with, endorsed by, or sponsored by The Pokémon Company International, Inc., Game Freak, Inc., or Nintendo Co., Ltd. Pokémon and all related names, logos, and imagery are trademarks of their respective owners.</p>
</footer>

{#if showConfirm}
  <ConfirmDialog
    onconfirm={() => { deckState.reset(); showConfirm = false; }}
    oncancel={() => (showConfirm = false)}
  />
{/if}

{#if pickerCard}
  <PrintPicker
    cardName={pickerCard.name}
    clickedSetCode={pickerCard.setCode}
    clickedNumber={pickerCard.number}
    initialPrints={getPickerDeckCards(pickerCard.name)}
    onclose={handlePickerClose}
  />
{/if}

<style>
  .app-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 14px 0;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }

  .brand {
    grid-column: 2;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-img {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
  }

  .logo-img.blending :global(.blade) {
    transform-box: fill-box;
    transform-origin: center;
    animation: blade-spin 0.4s linear infinite;
  }

  .logo-img.blending :global(.liquid) {
    transform-box: fill-box;
    transform-origin: center;
    animation: liquid-pulse 0.8s ease-in-out infinite;
  }

  .logo-img.blending :global(.sparkle) {
    transform-box: fill-box;
    transform-origin: center;
  }

  .logo-img.blending :global(.sparkle-1) {
    animation: sparkle-dance 1.4s ease-in-out infinite 0s;
  }
  .logo-img.blending :global(.sparkle-2) {
    animation: sparkle-dance 1.4s ease-in-out infinite 0.45s;
  }
  .logo-img.blending :global(.sparkle-3) {
    animation: sparkle-dance 1.4s ease-in-out infinite 0.9s;
  }

  @keyframes blade-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes liquid-pulse {
    0%, 100% { opacity: 0.9; transform: scale(1); }
    50%       { opacity: 0.3; transform: scale(0.85); }
  }

  @keyframes sparkle-dance {
    0%   { opacity: 0.9; transform: scale(1)    translate(0px,  0px) rotate(0deg); }
    25%  { opacity: 0.2; transform: scale(0.5)  translate(2px, -3px) rotate(45deg); }
    50%  { opacity: 1;   transform: scale(1.3)  translate(-2px, 1px) rotate(0deg); }
    75%  { opacity: 0.3; transform: scale(0.6)  translate(1px,  3px) rotate(-30deg); }
    100% { opacity: 0.9; transform: scale(1)    translate(0px,  0px) rotate(0deg); }
  }

  .wordmark {
    font-size: 28px;
    font-weight: 800;
    color: var(--text-h);
    letter-spacing: -0.5px;
  }

  .header-actions {
    grid-column: 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .deck-total {
    font-size: 13px;
    font-weight: 700;
    background: var(--border);
    color: var(--accent);
    padding: 4px 10px;
    border-radius: 20px;
  }

  footer {
    margin-top: 40px;
    padding: 16px 0;
    border-top: 1px solid var(--border);
    text-align: center;
  }

  footer p {
    font-size: 11px;
    color: var(--text-d, #888);
    max-width: 640px;
    margin: 0 auto;
    line-height: 1.5;
  }

  .deck-total.invalid {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error);
  }

  .btn-outline {
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    background: none;
    color: var(--accent);
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;
  }

  .btn-outline:hover {
    border-color: var(--accent);
    background: var(--border);
  }

  .error-banner {
    padding: 16px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid var(--error);
    border-radius: 8px;
    text-align: center;
    margin-bottom: 20px;
  }

  .error-banner p {
    margin: 0 0 12px;
    color: var(--error);
  }

  .error-banner button {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }

  .deck-loading {
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .deck-loading-bar {
    height: 100%;
    width: 40%;
    background: var(--accent);
    border-radius: 2px;
    animation: loading-slide 1.2s ease-in-out infinite;
  }

  @keyframes loading-slide {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }

  .parse-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(239, 68, 68, 0.06);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 8px;
    font-size: 13px;
    color: var(--error);
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .parse-warning code {
    font-family: var(--mono);
    font-size: 12px;
    background: rgba(239, 68, 68, 0.08);
    padding: 1px 5px;
    border-radius: 4px;
  }

  .parse-warning button {
    margin-left: auto;
    flex-shrink: 0;
    padding: 2px 8px;
    border: none;
    background: none;
    color: var(--error);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    border-radius: 4px;
  }

  .parse-warning button:hover {
    background: rgba(239, 68, 68, 0.1);
  }
</style>
