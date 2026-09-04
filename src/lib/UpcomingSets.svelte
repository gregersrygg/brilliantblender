<script>
  import { onMount } from 'svelte';
  import upcomingSetsData from '../data/upcoming-sets.json';
  import { sortByReleaseDate, legalToPlayDate, upcomingStatus } from './upcoming.js';
  import { formatLegalDate, todayIso } from './legality.js';

  // `today` is normally left unset and resolved on mount; an explicit value can be
  // passed to pin the date (used in tests/visual checks).
  let { today: todayProp = null } = $props();

  const sets = sortByReleaseDate(upcomingSetsData);

  // The set names/dates are static (from the bundled JSON) and render identically on the
  // build-time prerender server and the client — safe to show immediately. Anything that
  // depends on *today* (the status pill, the §4.1.3 note) stays blank until mount, so the
  // prerendered landing and the first client render match (no hydration mismatch).
  // See docs/architecture.md → "Prerendering".
  let mountedToday = $state('');
  onMount(() => {
    mountedToday = todayIso();
  });
  let today = $derived(todayProp ?? mountedToday);
  let dateAware = $derived(today !== '');

  // The reprint note below the table names the set the §4.1.3 rule currently applies to:
  // one that's playable early (prerelease or just released) but not fully legal yet.
  let earlySet = $derived.by(() => {
    if (!dateAware) return null;
    return (
      sets.find((s) => {
        const status = upcomingStatus(s, today);
        if (status !== 'prerelease' && status !== 'released') return false;
        const legal = legalToPlayDate(s);
        return legal === null || today < legal;
      }) ?? null
    );
  });
</script>

{#if sets.length > 0}
  <section class="upcoming" aria-label="Upcoming sets">
    <h2>Upcoming sets</h2>

    <div class="table" role="table">
      <div class="row head" role="row">
        <span role="columnheader">Set</span>
        <span role="columnheader">Release</span>
        <span role="columnheader">Legal</span>
        <span role="columnheader">Status</span>
      </div>
      {#each sets as set (set.name)}
        {@const legal = legalToPlayDate(set)}
        {@const provisional = legal !== null && set.isSpecialSet && typeof set.legalFrom !== 'string'}
        {@const status = dateAware ? upcomingStatus(set, today) : 'announced'}
        <div class="row" role="row">
          <span class="set" role="cell">
            {#if set.sourceUrl}
              <a class="set-name" data-testid="set-name" href={set.sourceUrl} target="_blank" rel="noopener noreferrer">
                {set.name}
              </a>
            {:else}
              <span class="set-name" data-testid="set-name">{set.name}</span>
            {/if}
            <span class="set-series">{set.series}</span>
          </span>
          <span role="cell" data-label="Release">{formatLegalDate(set.releaseDate)}</span>
          <span role="cell" data-label="Legal" class:unknown={legal === null}>
            {#if legal}<span
                class:provisional
                data-testid={provisional ? 'legal-provisional' : undefined}
                title={provisional ? 'Provisional — the official tournament-legal date is confirmed at the set’s release' : undefined}
                aria-label={provisional ? `${formatLegalDate(legal)} (provisional)` : undefined}
              >{formatLegalDate(legal)}</span>{:else}?{/if}
          </span>
          <span role="cell" data-label="Status">
            {#if dateAware && status === 'prerelease'}
              <span class="pill" data-testid="status-prerelease">● Prerelease</span>
            {:else if dateAware && status === 'released'}
              <span class="pill released" data-testid="status-released">● Released</span>
            {:else}
              <span class="muted">Announced</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>

    {#if earlySet}
      {@const earlyStatus = upcomingStatus(earlySet, today)}
      {@const earlyLegal = legalToPlayDate(earlySet)}
      <p class="note" data-testid="reprint-note">
        ⓘ {earlySet.name}
        {earlyStatus === 'released' ? 'has released' : 'prerelease has started'} —
        functional reprints are
        {earlyStatus === 'released' ? 'legal to play now' : 'already legal to play'}
        (§4.1.3){#if earlyLegal}; brand-new cards become legal {formatLegalDate(earlyLegal)}{/if}.{#if earlyStatus === 'released'}{' '}Card data usually appears within a day or two of release.{/if}
      </p>
    {/if}
  </section>
{/if}

<style>
  .upcoming {
    max-width: 720px;
    margin: 48px auto 0;
  }

  h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-h);
    text-align: center;
    margin: 0 0 24px;
  }

  .table {
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  .row {
    display: grid;
    grid-template-columns: 2fr 1.2fr 1.2fr 1.1fr;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    font-size: 13px;
  }

  .row + .row {
    border-top: 1px solid var(--border);
  }

  .row.head {
    background: var(--border);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--text);
  }

  .set {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .set-name {
    font-weight: 700;
    color: var(--text-h);
  }

  a.set-name {
    text-decoration: none;
  }

  a.set-name:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  a.set-name:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 3px;
  }

  .set-series {
    font-size: 11px;
    color: var(--text);
    opacity: 0.7;
  }

  .row span[role='cell'] {
    color: var(--text-h);
    font-weight: 600;
  }

  .row span.unknown {
    color: var(--notice);
    font-size: 15px;
    line-height: 1;
  }

  /* Special sets' legal date is computed from a press-release ETB/Booster-Bundle date
     and stays provisional until the official date is confirmed at release — flag it with
     an amber dotted underline (a notice, not an error) and a hover tooltip. */
  .provisional {
    color: var(--notice);
    text-decoration: underline dotted;
    text-underline-offset: 3px;
    cursor: help;
  }

  .pill {
    color: var(--notice);
    font-weight: 700;
    white-space: nowrap;
  }

  .pill.released {
    color: var(--accent);
  }

  .muted {
    color: var(--text);
    opacity: 0.7;
    font-weight: 600;
  }

  .note {
    margin: 14px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--notice);
  }

  @media (max-width: 540px) {
    .row {
      grid-template-columns: 1fr;
      row-gap: 6px;
    }
    /* Keep the header in the DOM for screen-reader column semantics, but hide it
       visually — sighted users get per-cell labels via [data-label]::before instead.
       (display:none would drop the labels entirely; ::before content isn't announced.) */
    .row.head {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
    .row span[role='cell'][data-label] {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .row span[role='cell'][data-label]::before {
      content: attr(data-label);
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: var(--text);
      opacity: 0.7;
    }
  }
</style>
