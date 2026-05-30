<script>
  import { CHANGELOG } from './changelog.js';

  const fmt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function formatDate(iso) {
    // iso is YYYY-MM-DD — parse as local date to avoid timezone drift.
    const [y, m, d] = iso.split('-').map(Number);
    return fmt.format(new Date(y, m - 1, d));
  }
</script>

<section class="changelog" aria-label="What’s new">
  <h2>What’s new</h2>
  <ul class="entries">
    {#each CHANGELOG as entry}
      <li class="entry">
        <time class="date" datetime={entry.date}>{formatDate(entry.date)}</time>
        <ul class="items">
          {#each entry.items as item}
            <li>{item}</li>
          {/each}
        </ul>
      </li>
    {/each}
  </ul>
</section>

<style>
  .changelog {
    max-width: 640px;
    margin: 48px auto 0;
  }

  h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-h);
    text-align: center;
    margin: 0 0 24px;
  }

  .entries {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .entry {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 12px;
  }

  .date {
    font-size: 12px;
    font-weight: 600;
    color: var(--subtle);
    padding-top: 1px;
  }

  .items {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .items li {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text);
  }

  @media (max-width: 540px) {
    .entry {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }
</style>
