<script>
  import DeckInput from './lib/DeckInput.svelte';
  import DeckView from './lib/DeckView.svelte';
  import ExportButton from './lib/ExportButton.svelte';
  import PrintPicker from './lib/PrintPicker.svelte';
  import ConfirmDialog from './lib/ConfirmDialog.svelte';
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
          result.push({ setCode: card.setCode, number: card.number, qty: card.qty });
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
    <div class="logo-mark" aria-hidden="true">✦</div>
    <span class="wordmark">brilliant blender</span>
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
    {#if parseErrorCount > 0 && !dismissedParseWarning}
      <div class="parse-warning" role="alert" data-testid="parse-warning">
        {parseErrorCount} line(s) couldn't be parsed and were skipped. Expected format:
        <code>4 Gardevoir ex SVI 86</code>
        <button onclick={() => (dismissedParseWarning = true)} aria-label="Dismiss">✕</button>
      </div>
    {/if}
    <DeckView
      sections={deckState.deck.sections}
      onincrement={deckState.incrementCard}
      ondecrement={deckState.decrementCard}
      warnings={deckState.getWarnings()}
      onpick={handlePick}
    />
  {:else}
    <DeckInput onload={handleLoad} />
  {/if}
</main>

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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
    gap: 10px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    flex-shrink: 0;
  }

  .wordmark {
    font-size: 17px;
    font-weight: 800;
    color: var(--text-h);
    letter-spacing: -0.3px;
  }

  .header-actions {
    display: flex;
    align-items: center;
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
