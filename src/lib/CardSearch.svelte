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
  let requestId = 0;
  let rootEl;
  let inputEl;

  // Close the dropdown on a pointer-down outside the component. This unified
  // pointer event covers both mouse (desktop "click away") and touch. Crucially
  // it does NOT fire when the input merely loses focus — e.g. when an iOS user
  // dismisses the on-screen keyboard — so results survive keyboard dismissal
  // (issue #33). Active only while the dropdown is open.
  $effect(() => {
    if (!open) return;
    function onPointerDownOutside(e) {
      if (rootEl && !rootEl.contains(e.target)) open = false;
    }
    document.addEventListener('pointerdown', onPointerDownOutside, true);
    return () => document.removeEventListener('pointerdown', onPointerDownOutside, true);
  });

  function onInput(e) {
    query = e.target.value;
    clearTimeout(debounceTimer);
    if (query.length < 2) {
      results = [];
      open = false;
      return;
    }
    debounceTimer = setTimeout(async () => {
      const id = ++requestId;
      results = [];
      loading = true;
      open = true;
      const all = await searchCards(query);
      if (id !== requestId) return;
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

  function clearSearch() {
    query = '';
    results = [];
    open = false;
    inputEl?.focus(); // keep focus so the user can immediately retype
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

<div class="card-search" bind:this={rootEl}>
  <div class="search-input-wrap">
    <span class="search-icon" aria-hidden="true">🔍</span>
    <input
      class="search-input"
      type="text"
      placeholder="Search cards to add…"
      value={query}
      oninput={onInput}
      onkeydown={onKeydown}
      onfocus={onFocus}
      bind:this={inputEl}
      autocomplete="off"
      spellcheck="false"
    />
    {#if loading}
      <span class="search-spinner" aria-label="Searching">⋯</span>
    {:else if query}
      <button type="button" class="search-clear" aria-label="Clear search" onclick={clearSearch}>✕</button>
    {/if}
  </div>

  {#if open && results.length > 0}
    <ul class="search-results" role="listbox">
      {#each results as card}
        <li
          class="search-result"
          role="option"
          aria-selected="false"
          title={card.name}
          onmousedown={() => selectCard(card)}
        >
          <div class="result-image">
            {#if card.images?.small}
              <img class="result-thumb" src={card.images.small} alt={card.name} loading="lazy" />
            {:else}
              <div class="result-thumb-placeholder"></div>
            {/if}
            <span class="result-type-badge {supertypeClass(card.supertype)}">{supertypeBadge(card.supertype)}</span>
          </div>
          <div class="result-info">
            <span class="result-name">{card.name}</span>
            <span class="result-set">{card.set?.ptcgoCode ?? card.set?.id ?? '?'} {card.number}</span>
          </div>
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
    font-size: 16px;
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

  .search-clear {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin: -4px -4px -4px 0;
    border: none;
    background: none;
    border-radius: 50%;
    font-size: 16px;
    line-height: 1;
    color: var(--text);
    opacity: 0.6;
    cursor: pointer;
    transition: opacity 100ms ease, background 100ms ease;
  }

  .search-clear:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--text) 10%, transparent);
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
    padding: 8px;
    z-index: 200;
    max-height: 70vh;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .search-result {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 6px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 100ms ease;
  }

  .search-result:hover {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .result-image {
    position: relative;
    width: 100%;
  }

  .result-thumb {
    width: 100%;
    display: block;
    border-radius: 6px;
  }

  .result-thumb-placeholder {
    width: 100%;
    aspect-ratio: 245 / 342;
    background: var(--skeleton);
    border-radius: 6px;
  }

  .result-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    text-align: center;
  }

  .result-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-h);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .result-set {
    font-size: 12px;
    color: var(--text);
    opacity: 0.7;
  }

  .result-type-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
    color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .badge-pokemon { background: #7c3aed; }
  .badge-trainer { background: #0891b2; }
  .badge-energy  { background: #15803d; }

  @media (max-width: 640px) {
    .search-results {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      max-height: 65vh;
    }

    .result-name {
      font-size: 13px;
    }

    .result-set {
      font-size: 11px;
    }
  }

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
