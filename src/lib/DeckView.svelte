<script>
  import CardTile from './CardTile.svelte';

  let { sections } = $props();
</script>

<div class="deck-view">
  {#each sections as section}
    <section class="deck-section">
      <h2>{section.name} <span class="section-count">({section.count})</span></h2>
      <div class="card-grid">
        {#each section.cards as card}
          <CardTile {card} />
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
