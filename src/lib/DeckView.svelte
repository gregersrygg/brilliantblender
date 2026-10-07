<script>
  import CardTile from './CardTile.svelte';

  let { sections, total, onincrement, ondecrement, warnings, onpick = null, onremove = null } = $props();
</script>

<div class="deck-view">
  <div class="deck-summary" data-testid="deck-summary">
    <span class="deck-summary-label">Deck</span>
    <span class="deck-total" class:invalid={total !== 60}>{total} / 60</span>
  </div>
  {#each sections as section}
    {@const visibleCards = section.cards.filter(c => c.qty > 0 || c.error)}
    {@const sectionCount = section.cards.filter(c => !c.error && c.qty > 0).reduce((sum, c) => sum + c.qty, 0)}
    <section class="deck-section">
      <h2>{section.name} <span class="section-count">({sectionCount})</span></h2>
      <div class="card-grid">
        {#each visibleCards as card}
          <CardTile
            {card}
            {onincrement}
            {ondecrement}
            warning={warnings.get(card.name) ?? null}
            onpick={section.name === 'Pokémon' ? onpick : null}
            {onremove}
          />
        {/each}
      </div>
      {#if section.name !== 'Pokémon'}
        <p class="no-swap-note">ℹ Swap Print is only available for Pokémon cards.</p>
      {/if}
    </section>
  {/each}
</div>

<style>
  .deck-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .deck-summary {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: -8px;
  }

  .deck-summary-label {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-h);
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

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-h);
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .section-count {
    font-weight: 400;
    color: var(--text);
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .no-swap-note {
    margin: 8px 0 0;
    font-size: 11px;
    color: var(--text);
    opacity: 0.6;
  }
</style>
