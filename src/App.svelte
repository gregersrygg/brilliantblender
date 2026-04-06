<script>
  import DeckInput from './lib/DeckInput.svelte';
  import DeckView from './lib/DeckView.svelte';
  import ExportButton from './lib/ExportButton.svelte';
  import PrintPicker from './lib/PrintPicker.svelte';
  import { createDeck } from './lib/deck.svelte.js';

  const deckState = createDeck();
  let pickerCard = $state(null); // { name, setCode, number } | null

  function handleLoad(text) {
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

<main>
  <h1>Brilliant Blender</h1>

  {#if deckState.error}
    <div class="error-banner" role="alert">
      <p>{deckState.error}</p>
      <button onclick={() => deckState.reset()}>Try Again</button>
    </div>
  {:else if deckState.deck}
    <div class="deck-toolbar">
      <ExportButton onexport={() => deckState.exportDeck()} />
      <span class="deck-total" class:invalid={deckState.deckTotal !== 60}>{deckState.deckTotal} / 60</span>
    </div>
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

  {#if pickerCard}
    <PrintPicker
      cardName={pickerCard.name}
      clickedSetCode={pickerCard.setCode}
      clickedNumber={pickerCard.number}
      initialPrints={getPickerDeckCards(pickerCard.name)}
      onclose={handlePickerClose}
    />
  {/if}
</main>

<style>
  h1 {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 24px;
    color: var(--text-h);
  }

  .error-banner {
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error);
    border-radius: 8px;
    text-align: center;
  }

  .error-banner p {
    margin: 0 0 12px;
    color: var(--error);
  }

  .deck-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    align-items: center;
  }

  .deck-total {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  .deck-total.invalid {
    color: var(--error);
    font-weight: 600;
  }

  .error-banner button {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }
</style>
