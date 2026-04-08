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
    <img src="{import.meta.env.BASE_URL}logo.svg" alt="Brilliant Blender" class="logo-img" />
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
