<script>
  import { searchCards } from './api.js';
  import { LEGAL_REGULATION_MARKS } from './config.js';

  function isLegalCard(card) {
    // Basic energy is always legal regardless of regulation mark
    if (card.supertype === 'Energy' && (card.subtypes ?? []).includes('Basic')) return true;
    return LEGAL_REGULATION_MARKS.includes(card.regulationMark);
  }

  let { onadd } = $props();

  let query = $state('');
  let results = $state([]);
  let loading = $state(false);
  let open = $state(false);
  let debounceTimer;

  function onInput(e) {
    query = e.target.value;
    clearTimeout(debounceTimer);
    if (query.length < 2) {
      results = [];
      open = false;
      return;
    }
    debounceTimer = setTimeout(async () => {
      loading = true;
      open = true;
      const all = await searchCards(query);
      results = all.filter(isLegalCard);
      loading = false;
    }, 300);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      query = '';
      results = [];
      open = false;
    }
  }

  function selectCard(card) {
    onadd(card);
    query = '';
    results = [];
    open = false;
  }

  function onBlur() {
    // Small delay so click on result registers before blur closes dropdown
    setTimeout(() => { open = false; }, 150);
  }

  function onFocus() {
    if (results.length > 0) open = true;
  }

  function supertypeBadge(supertype) {
    if (supertype === 'Pokémon') return 'P';
    if (supertype === 'Trainer') return 'T';
    if (supertype === 'Energy') return 'E';
    return '?';
  }

  function supertypeClass(supertype) {
    if (supertype === 'Pokémon') return 'badge-pokemon';
    if (supertype === 'Trainer') return 'badge-trainer';
    if (supertype === 'Energy') return 'badge-energy';
    return '';
  }
</script>

<div class="card-search">
  <div class="search-input-wrap">
    <span class="search-icon" aria-hidden="true">🔍</span>
    <input
      class="search-input"
      type="text"
      placeholder="Search cards to add…"
      value={query}
      oninput={onInput}
      onkeydown={onKeydown}
      onblur={onBlur}
      onfocus={onFocus}
      autocomplete="off"
      spellcheck="false"
    />
    {#if loading}
      <span class="search-spinner" aria-label="Searching">⋯</span>
    {/if}
  </div>

  {#if open && results.length > 0}
    <ul class="search-results" role="listbox">
      {#each results as card}
        <li
          class="search-result"
          role="option"
          aria-selected="false"
          onmousedown={() => selectCard(card)}
        >
          {#if card.images?.small}
            <img class="result-thumb" src={card.images.small} alt={card.name} loading="lazy" />
          {:else}
            <div class="result-thumb-placeholder"></div>
          {/if}
          <div class="result-info">
            <span class="result-name">{card.name}</span>
            <span class="result-set">{card.set?.ptcgoCode ?? card.set?.id ?? '?'} {card.number}</span>
          </div>
          <span class="result-type-badge {supertypeClass(card.supertype)}">{supertypeBadge(card.supertype)}</span>
        </li>
      {/each}
    </ul>
  {:else if open && !loading && query.length >= 2}
    <div class="search-no-results">No cards found for "{query}"</div>
  {/if}
</div>

<style>
  .card-search {
    position: relative;
    margin-bottom: 16px;
  }

  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    transition: border-color 150ms ease;
  }

  .search-input-wrap:focus-within {
    border-color: var(--accent);
  }

  .search-icon {
    font-size: 14px;
    flex-shrink: 0;
    opacity: 0.6;
  }

  .search-input {
    flex: 1;
    border: none;
    background: none;
    font-size: 14px;
    color: var(--text-h);
    outline: none;
  }

  .search-input::placeholder {
    color: var(--text);
    opacity: 0.5;
  }

  .search-spinner {
    font-size: 18px;
    color: var(--accent);
    animation: spin-dots 1s steps(3) infinite;
  }

  @keyframes spin-dots {
    0% { opacity: 1; }
    33% { opacity: 0.5; }
    66% { opacity: 0.2; }
  }

  .search-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    list-style: none;
    margin: 0;
    padding: 4px;
    z-index: 200;
    max-height: 340px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .search-result {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: 7px;
    cursor: pointer;
    transition: background 100ms ease;
  }

  .search-result:hover {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .result-thumb {
    width: 36px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .result-thumb-placeholder {
    width: 36px;
    aspect-ratio: 245 / 342;
    background: var(--skeleton);
    border-radius: 3px;
    flex-shrink: 0;
  }

  .result-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .result-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-set {
    font-size: 11px;
    color: var(--text);
    opacity: 0.7;
  }

  .result-type-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
    flex-shrink: 0;
    color: white;
  }

  .badge-pokemon { background: #7c3aed; }
  .badge-trainer { background: #0891b2; }
  .badge-energy  { background: #15803d; }

  .search-no-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    color: var(--text);
    opacity: 0.6;
    z-index: 200;
  }
</style>
