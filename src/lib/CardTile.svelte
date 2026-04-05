<script>
  let { card } = $props();
</script>

<div class="card-tile" data-testid="card-tile">
  {#if card.cardLoading}
    <div class="skeleton"></div>
  {:else if card.cardError}
    <div class="error-card">
      <span class="warning-icon">&#x26A0;</span>
      <span class="card-name">{card.name}</span>
    </div>
  {:else}
    <div class="card-image-wrapper">
      <span class="qty-badge">{card.qty}</span>
      <img src={card.image} alt={card.name} loading="lazy" />
    </div>
  {/if}
  {#if !card.cardError}
    <div class="card-label">{card.name} {card.setCode} {card.number}</div>
  {/if}
</div>

<style>
  .card-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
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

  .qty-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 10px;
    line-height: 1.2;
  }

  .card-label {
    font-size: 11px;
    color: var(--text);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
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
