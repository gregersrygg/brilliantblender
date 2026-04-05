<script>
  import CardTile from './CardTile.svelte';

  let { sections, onincrement, ondecrement, warnings } = $props();
</script>

<div class="deck-view">
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
          />
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .deck-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
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
</style>
