<script>
  let { onload } = $props();
  let text = $state('');
</script>

<div class="deck-input">
  <p class="subtitle">Paste a decklist from Limitless, PTCGL, or RK9. See your cards, swap prints, and export a tournament-ready list.</p>
  <label for="deck-textarea" class="sr-only">Paste your decklist</label>
  <textarea
    id="deck-textarea"
    aria-label="Paste your decklist"
    bind:value={text}
    placeholder={"Pokémon: 4\n4 Gardevoir ex SVI 86\n\nTrainer: 4\n4 Nest Ball SVI 181\n\nEnergy: 4\n4 Psychic Energy SVE 5"}
    rows="12"
  ></textarea>
  <button disabled={text.trim() === ''} onclick={() => onload(text)}>
    Load Deck
  </button>
</div>

<style>
  .deck-input {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 600px;
    margin: 0 auto;
  }

  textarea {
    font-family: var(--mono);
    font-size: 14px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-h);
    resize: vertical;
    width: 100%;
  }

  textarea::placeholder {
    color: var(--text);
    opacity: 0.5;
  }

  button {
    align-self: flex-start;
    padding: 10px 24px;
    font-size: 16px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--subtle, var(--text));
    line-height: 1.6;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>
