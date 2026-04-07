<script>
  let { card, onincrement, ondecrement, warning = null, onpick = null, onremove = null } = $props();
</script>

<div
  class="card-tile"
  class:card-warning={warning || (card.isRotating && card.qty > 0)}
  data-testid="card-tile"
>
  {#if card.cardLoading}
    <div class="skeleton"></div>
  {:else if card.cardError}
    <div class="error-card">
      {#if onremove}
        <button class="remove-btn" onclick={() => onremove(card)} aria-label="Remove {card.name}">×</button>
      {/if}
      <span class="warning-icon">&#x26A0;</span>
      <span class="card-name">{card.name}</span>
    </div>
  {:else}
    <div class="card-image-wrapper">
      {#if onpick}
        <button
          class="pick-trigger"
          aria-label="Choose alternate print for {card.name}"
          onclick={() => onpick(card)}
        >
          <img src={card.image} alt={card.name} loading="lazy" />
          <div class="pick-overlay" aria-hidden="true">
            <span class="pick-icon">⇄</span>
            <span class="pick-label">Swap Print</span>
          </div>
        </button>
      {:else}
        <img src={card.image} alt={card.name} loading="lazy" />
      {/if}
    </div>
  {/if}
  {#if !card.cardError}
    <div class="card-label">
      {#if card.supertype === 'Trainer' || (card.supertype === 'Energy' && !card.isBasicEnergy)}
        {card.name}
      {:else}
        {card.setCode} {card.number}
      {/if}
    </div>
  {/if}
  {#if !card.cardLoading && !card.cardError}
    <div class="qty-controls">
      <button
        class="qty-btn"
        data-testid="decrement"
        onclick={() => ondecrement(card)}
        disabled={card.qty === 0}
      >−</button>
      <span class="qty-display" data-testid="qty-display">{card.qty}</span>
      <button
        class="qty-btn"
        data-testid="increment"
        onclick={() => onincrement(card)}
      >+</button>
    </div>
  {/if}
  {#if card.isRotating && card.qty > 0}
    <div class="warning-text">Not Standard-legal</div>
  {:else if warning}
    <div class="warning-text">{warning}</div>
  {/if}
</div>

<style>
  .card-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .card-warning {
    border: 2px solid var(--error);
    border-radius: 8px;
    padding: 4px;
  }

  .card-image-wrapper {
    position: relative;
    width: 100%;
  }

  .card-image-wrapper img {
    width: 100%;
    border-radius: 6px;
    display: block;
  }

  .pick-trigger {
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 6px;
    position: relative;
  }

  .pick-trigger:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .pick-trigger img {
    width: 100%;
    border-radius: 6px;
    display: block;
  }

  .pick-overlay {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    background: rgba(30, 27, 75, 0.55);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 150ms ease;
    pointer-events: none;
  }

  .pick-trigger:hover .pick-overlay {
    opacity: 1;
  }

  .pick-icon {
    font-size: 22px;
    color: white;
  }

  .pick-label {
    font-size: 11px;
    font-weight: 700;
    color: white;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .card-label {
    font-size: 11px;
    color: var(--text);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    opacity: 0.7;
  }

  .qty-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .qty-btn {
    padding: 2px 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg, #fff);
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    line-height: 1.4;
  }

  .qty-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .qty-display {
    font-size: 15px;
    font-weight: 600;
    min-width: 20px;
    text-align: center;
    color: var(--text-h);
  }

  .warning-text {
    font-size: 10px;
    color: var(--error);
    text-align: center;
  }

  .skeleton {
    width: 100%;
    aspect-ratio: 245 / 342;
    background: var(--skeleton);
    border-radius: 6px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .error-card {
    width: 100%;
    aspect-ratio: 245 / 342;
    background: var(--skeleton);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px;
    position: relative;
  }

  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    border: none;
    background: rgba(0, 0, 0, 0.45);
    color: white;
    font-size: 14px;
    line-height: 1;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .remove-btn:hover {
    background: var(--error);
  }

  .warning-icon {
    font-size: 24px;
  }

  .error-card .card-name {
    font-size: 12px;
    color: var(--error);
    text-align: center;
    word-break: break-word;
  }
</style>
