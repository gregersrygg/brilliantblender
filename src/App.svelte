<script>
  import DeckInput from './lib/DeckInput.svelte';
  import DeckView from './lib/DeckView.svelte';
  import ExportButton from './lib/ExportButton.svelte';
  import { createDeck } from './lib/deck.svelte.js';

  const deckState = createDeck();

  function handleLoad(text) {
    deckState.loadDeck(text);
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
    </div>
    <DeckView sections={deckState.deck.sections} />
  {:else}
    <DeckInput onload={handleLoad} />
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
