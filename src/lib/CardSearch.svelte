<script>
  import { filterSnapshot, getSnapshotSetCodes } from './snapshot.js';
  import { searchCards } from './api.js';
  import { LEGAL_REGULATION_MARKS } from './config.js';
  import { parseQuery, appendToken, removeToken, ENERGY_LETTER_TO_NAME } from './card-query.js';

  let { onadd } = $props();

  function isLegalCard(card) {
    if (card.supertype === 'Energy' && (card.subtypes ?? []).includes('Basic')) return true;
    return LEGAL_REGULATION_MARKS.includes(card.regulationMark);
  }

  // `committed` holds finished operator tokens (rendered as chips); `draft` is the live
  // input text (name terms + the token being typed). The full query — the single source
  // of truth for filtering and the </> mirror — is the two joined.
  let committed = $state('');
  let draft = $state('');
  let rawMode = $state(false); // "edit as text": the whole query lives in one input
  let menuOpen = $state(false);
  let inputEl;
  let rootEl;

  const query = $derived(`${committed} ${draft}`.replace(/\s+/g, ' ').trim());
  const parsed = $derived(parseQuery(query));
  const snap = $derived.by(() => filterSnapshot(query));
  const chips = $derived(parseQuery(committed).tokens.filter(t => t.op && t.valid));

  // A name-only query (no operators) can fall back to the API when the snapshot has no
  // hit — graceful degradation if the snapshot is disabled (tests) or missing a brand-new
  // card. Rich operator queries require the snapshot.
  const nameOnly = $derived(parsed.tokens.length > 0 && parsed.tokens.every(t => !t.op) && parsed.tokens.some(t => t.valid));
  const nameString = $derived(parsed.tokens.filter(t => t.kind === 'name' && t.valid).map(t => t.value).join(' '));
  let apiResults = $state([]);
  let reqId = 0;

  $effect(() => {
    const need = nameOnly && snap.total === 0 && nameString.length >= 2;
    if (!need) { apiResults = []; return; }
    const id = ++reqId;
    const timer = setTimeout(async () => {
      const all = await searchCards(nameString);
      if (id === reqId) apiResults = all.filter(isLegalCard);
    }, 250);
    return () => clearTimeout(timer);
  });

  const result = $derived(
    snap.total === 0 && nameOnly && apiResults.length
      ? { cards: apiResults, total: apiResults.length }
      : snap
  );

  const NAME_TO_LETTER = Object.fromEntries(
    Object.entries(ENERGY_LETTER_TO_NAME).map(([k, v]) => [v, k])
  );
  // Dragon (n) is a Pokémon type but has no energy of its own, so it never appears in an
  // attack cost or as a weakness — offer it only where it's real.
  const TYPE_ENERGIES = ['g', 'r', 'w', 'l', 'p', 'f', 'd', 'm', 'n', 'c'];
  const WEAK_ENERGIES = ['g', 'r', 'w', 'l', 'p', 'f', 'd', 'm'];
  const COST_ENERGIES = ['g', 'r', 'w', 'l', 'p', 'f', 'd', 'm', 'c'];

  // The operator the user is mid-typing (last draft token, not yet space-terminated).
  const activeOp = $derived.by(() => {
    if (rawMode || /\s$/.test(draft)) return null;
    const toks = parseQuery(draft).tokens;
    const last = toks[toks.length - 1];
    return last && last.op && last.kind !== 'unknown' ? last : null;
  });

  const FILTERS = [
    { op: 'type', icon: '🔵', label: 'Pokémon type', picker: 'energy' },
    { op: 'ac', icon: '🔥', label: 'Attack cost', picker: 'ac' },
    { op: 'hp', icon: '❤️', label: 'HP', picker: 'num' },
    { op: 'tr', icon: '🎴', label: 'Trainer type', picker: 'options' },
    { op: 'stage', icon: '⬆️', label: 'Evolution stage', picker: 'options' },
    { op: 'pri', icon: '🏆', label: 'Prizes (ex / Mega)', picker: 'options' },
    { op: 'weak', icon: '🛡️', label: 'Weakness', picker: 'energy' },
    { op: 'rc', icon: '🏃', label: 'Retreat cost', picker: 'num' },
    { op: 'sub', icon: '✨', label: 'Special (Tera…)', picker: 'options' },
    { op: 'rarity', icon: '💎', label: 'Rarity (incl. alt art)', picker: 'options' },
    { op: 'set', icon: '📦', label: 'Set', picker: 'suggest' },
    { op: 'reg', icon: '🔤', label: 'Regulation mark', picker: 'suggest' },
    { op: 'text', icon: '📝', label: 'Card text', picker: null },
  ];
  const OPTIONS = {
    tr: [['item', 'Item'], ['supporter', 'Supporter'], ['stadium', 'Stadium'], ['tool', 'Tool']],
    stage: [['basic', 'Basic'], ['1', 'Stage 1'], ['2', 'Stage 2']],
    pri: [['1', 'Single'], ['2', 'ex · 2'], ['3', 'Mega · 3']],
    sub: [['tera', 'Tera'], ['ancient', 'Ancient'], ['future', 'Future'], ['ace', 'ACE SPEC']],
    rarity: [
      ['common', 'Common'], ['uncommon', 'Uncommon'], ['rare', 'Rare'],
      ['double', 'Double Rare'], ['ace', 'ACE SPEC'], ['promo', 'Promo'],
      ['ir', 'Illustration Rare'], ['sir', 'Special Illust.'],
      ['ur', 'Ultra Rare'], ['hyper', 'Hyper Rare'],
    ],
  };
  const NUM_PRESETS = {
    hp: [['60-', '≤ 60'], ['120+', '120+'], ['200+', '200+'], ['300+', '300+']],
    rc: [['0', 'Free'], ['1', '1'], ['2+', '2+'], ['3+', '3+']],
  };
  const filterFor = op => FILTERS.find(f => f.op === op);
  const pickerKind = $derived(activeOp ? filterFor(activeOp.op)?.picker : null);
  const energyGrid = $derived(activeOp?.op === 'weak' ? WEAK_ENERGIES : TYPE_ENERGIES);

  const SET_CODES = getSnapshotSetCodes();
  // Autocomplete rows for the `set:` / `reg:` value the user is typing.
  const suggestions = $derived.by(() => {
    if (pickerKind !== 'suggest' || !activeOp) return [];
    const p = (activeOp.value || '').split(',').pop().trim().toLowerCase();
    if (activeOp.op === 'reg') {
      return LEGAL_REGULATION_MARKS
        .filter(m => m.toLowerCase().startsWith(p))
        .map(m => ({ value: m, label: `Regulation ${m}` }));
    }
    return SET_CODES
      .filter(s => !p || s.code.toLowerCase().includes(p) || s.name.toLowerCase().includes(p))
      .slice(0, 12)
      .map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }));
  });

  // --- string surgery -------------------------------------------------------
  function promote() {
    const toks = parseQuery(draft).tokens;
    const endsSpace = /\s$/.test(draft);
    const keep = [];
    let moved = false;
    toks.forEach((t, i) => {
      const complete = t.op && t.valid && t.kind !== 'unknown' && (i < toks.length - 1 || endsSpace);
      if (complete) { committed = appendToken(committed, t.raw); moved = true; }
      else keep.push(t.raw);
    });
    if (moved) draft = keep.join(' ');
  }
  function onInput(e) {
    if (rawMode) { committed = ''; draft = e.target.value; return; }
    draft = e.target.value;
    promote();
    // Force the DOM to match: when promotion empties the draft, its value returns to
    // its previous ('') so Svelte skips the update and the typed text would linger.
    e.target.value = draft;
  }
  function removeChip(token) { committed = removeToken(committed, token); }
  function clearAll() { committed = ''; draft = ''; rawMode = false; inputEl?.focus(); }

  // Turn a committed chip back into editable text: drop it from the chips and drop its
  // source into the draft as the active token, which re-opens its picker.
  function editChip(chip) {
    const base = draft.trim();
    committed = removeToken(committed, chip);
    draft = (base ? base + ' ' : '') + chip.raw;
    rawMode = false;
    menuOpen = false;
    queueMicrotask(() => {
      inputEl?.focus();
      inputEl?.setSelectionRange?.(draft.length, draft.length);
    });
  }

  function enterRawMode() {
    draft = query;
    committed = '';
    rawMode = true;
    queueMicrotask(() => inputEl?.focus());
  }

  // Replace the active (last) draft token with new text; commit chips it immediately.
  function setActive(rawText, commit) {
    const at = activeOp ? activeOp.index : draft.length;
    draft = draft.slice(0, at) + rawText + (commit ? ' ' : '');
    if (commit) promote();
    inputEl?.focus();
  }
  // The raw value the user typed after `op:` — parsed from source, since classified tokens
  // don't all carry a `.value` field (type/weak/hp/… keep parsed forms instead).
  function currentValue() {
    if (!activeOp) return '';
    const i = activeOp.raw.indexOf(':');
    return i === -1 ? '' : activeOp.raw.slice(i + 1);
  }

  function openFilter(f) {
    menuOpen = false;
    rawMode = false;
    if (!/\s$/.test(draft) && draft) draft += ' ';
    draft += `${f.op}:`;
    inputEl?.focus();
  }

  // --- picker actions -------------------------------------------------------
  function toggleValue(letterOrKey) {
    const vals = currentValue().split(',').map(s => s.trim()).filter(Boolean);
    const i = vals.indexOf(letterOrKey);
    if (i === -1) vals.push(letterOrKey); else vals.splice(i, 1);
    setActive(vals.length ? `${activeOp.op}:${vals.join(',')}` : `${activeOp.op}:`, false);
  }
  function isSelected(key) {
    return currentValue().split(',').map(s => s.trim()).includes(key);
  }
  function commitActive() {
    if (activeOp && activeOp.valid) setActive(activeOp.raw, true);
  }
  function pickSuggestion(val) { setActive(`${activeOp.op}:${val}`, true); }
  function acAddSymbol(letter) { setActive(`ac:${currentValue()}{${letter}}`, false); }
  function acSuggest(v) { setActive(`ac:${v}`, true); }
  function setNum(v) { setActive(`${activeOp.op}:${v}`, true); }

  function pipClass(letter) { return `pip pip-${letter}`; }
  function chipPips(token) {
    if (token.kind !== 'type' && token.kind !== 'weak') return [];
    return token.values.map(v => NAME_TO_LETTER[v]).filter(Boolean);
  }

  // --- results --------------------------------------------------------------
  function supertypeBadge(s) { return s === 'Pokémon' ? 'P' : s === 'Trainer' ? 'T' : s === 'Energy' ? 'E' : '?'; }
  function supertypeClass(s) {
    return s === 'Pokémon' ? 'badge-pokemon' : s === 'Trainer' ? 'badge-trainer' : s === 'Energy' ? 'badge-energy' : '';
  }

  $effect(() => {
    if (!menuOpen) return;
    function away(e) { if (rootEl && !rootEl.contains(e.target)) menuOpen = false; }
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  });

  function onKeydown(e) {
    if (e.key === 'Escape') { menuOpen = false; if (activeOp) commitActive(); }
    else if (e.key === 'Enter' && activeOp) { e.preventDefault(); commitActive(); }
    else if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && chips.length
      && e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
      // Caret at the very start with chips to the left → edit the nearest chip instead of no-op.
      e.preventDefault();
      editChip(chips[chips.length - 1]);
    }
  }
</script>

<div class="card-search" bind:this={rootEl}>
  <div class="field" class:focused={activeOp || menuOpen}>
    <span class="search-icon" aria-hidden="true">🔍</span>
    {#if !rawMode}
      {#each chips as chip (chip.index)}
        <span class="chip" data-testid="search-chip">
          <button class="chip-body" title="Edit filter" onclick={() => editChip(chip)}>
            {#each chipPips(chip) as p}<span class={pipClass(p)}>{p.toUpperCase()}</span>{/each}
            <span class="chip-label">{chip.label}</span>
          </button>
          <button class="chip-x" aria-label="Remove filter" onclick={() => removeChip(chip)}>✕</button>
        </span>
      {/each}
    {/if}
    <input
      class="search-input"
      data-testid="card-search-input"
      type="text"
      placeholder={chips.length || rawMode ? '' : 'Search cards — or type type:, ac:, hp:…'}
      value={draft}
      oninput={onInput}
      onkeydown={onKeydown}
      bind:this={inputEl}
      autocomplete="off"
      spellcheck="false"
    />
    {#if query}
      <button type="button" class="clear" aria-label="Clear search" onclick={clearAll}>✕</button>
    {/if}
    <button type="button" class="plus" aria-label="Add a filter"
      onclick={() => (menuOpen = !menuOpen)}>＋</button>
  </div>

  {#if menuOpen}
    <div class="panel menu">
      <div class="panel-h">Add a filter</div>
      {#each FILTERS as f}
        <button class="menu-item" onclick={() => openFilter(f)}>
          <span class="mi-ic">{f.icon}</span><span>{f.label}</span><span class="mi-op">{f.op}:</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if activeOp && pickerKind}
    <div class="panel picker">
      <div class="panel-h">
        <span>{filterFor(activeOp.op)?.label}</span>
        <button class="done" onclick={commitActive} disabled={!activeOp.valid}>Done ↵</button>
      </div>

      {#if pickerKind === 'energy'}
        <div class="egrid">
          {#each energyGrid as l}
            <button class={pipClass(l) + (isSelected(l) ? ' on' : '')} onclick={() => toggleValue(l)}
              title={ENERGY_LETTER_TO_NAME[l]}>{l.toUpperCase()}</button>
          {/each}
        </div>
      {:else if pickerKind === 'suggest'}
        {#if suggestions.length}
          <div class="suggests">
            {#each suggestions as s}
              <button class="suggest" onmousedown={() => pickSuggestion(s.value)}>{s.label}</button>
            {/each}
          </div>
        {:else}
          <p class="hint-sm">No match — keep typing a {activeOp.op === 'reg' ? 'regulation mark' : 'set code'}.</p>
        {/if}
      {:else if pickerKind === 'options'}
        <div class="pills">
          {#if activeOp.op === 'rarity'}
            <button class="pill" class:on={currentValue() === 'all'} onclick={() => setActive('rarity:all', true)}>All rarities</button>
          {/if}
          {#each OPTIONS[activeOp.op] as [val, lbl]}
            <button class="pill" class:on={isSelected(val)} onclick={() => toggleValue(val)}>{lbl}</button>
          {/each}
        </div>
        {#if activeOp.op === 'rarity'}
          <p class="hint-sm">Alternate-art & chase rarities are hidden by default — pick <code>All rarities</code> to include them, or a rarity to see only those.</p>
        {/if}
      {:else if pickerKind === 'num'}
        <div class="pills">
          {#each NUM_PRESETS[activeOp.op] as [val, lbl]}
            <button class="pill" onclick={() => setNum(val)}>{lbl}</button>
          {/each}
          <span class="hint-sm">…or type a number, e.g. <code>{activeOp.op}:180+</code></span>
        </div>
      {:else if pickerKind === 'ac'}
        <div class="egrid">
          {#each COST_ENERGIES as l}
            <button class={pipClass(l)} onclick={() => acAddSymbol(l)} title={ENERGY_LETTER_TO_NAME[l]}>{l.toUpperCase()}</button>
          {/each}
        </div>
        <div class="ac-sugs">
          <button class="ac-sug" onclick={() => acSuggest(currentValue() || '{c}')}>Use <code>ac:{currentValue() || '{c}'}</code> (exact)</button>
          <button class="ac-sug" onclick={() => acSuggest('2+')}>Total 2+ energy <code>ac:2+</code></button>
          <button class="ac-sug" onclick={() => acSuggest('0')}>Free attack <code>ac:0</code></button>
        </div>
        <p class="hint-sm">Tap energies to build a cost, add <code>2</code>/<code>2+</code> after a symbol, or <code>{'{*}'}</code> for any type.</p>
      {/if}
    </div>
  {/if}

  {#if query}
    <div class="mirror">
      <span class="mirror-tag">&lt;/&gt;</span>
      <code class="mirror-code">{query}</code>
      {#if !rawMode}<button class="mirror-edit" onclick={enterRawMode}>edit as text ✎</button>
      {:else}<button class="mirror-edit" onclick={() => (rawMode = false)}>done ✓</button>{/if}
    </div>
  {/if}

  {#if query}
    <div class="rescount">
      {result.total === 0 ? 'No cards match' : `${result.total} card${result.total === 1 ? '' : 's'}`}
      {#if result.total > result.cards.length}<span class="dim">· showing first {result.cards.length}</span>{/if}
    </div>
    {#if result.cards.length}
      <ul class="search-results" role="listbox">
        {#each result.cards as card (card.id)}
          <li class="search-result" role="option" aria-selected="false" data-testid="search-result"
            title={card.name} onmousedown={() => onadd(card)}>
            <div class="result-image">
              {#if card.images?.small}
                <img class="result-thumb" src={card.images.small} alt={card.name} loading="lazy" />
              {:else}<div class="result-thumb-placeholder"></div>{/if}
              <span class="result-type-badge {supertypeClass(card.supertype)}">{supertypeBadge(card.supertype)}</span>
            </div>
            <div class="result-info">
              <span class="result-name">{card.name}</span>
              <span class="result-set">{card.set?.ptcgoCode ?? card.set?.id ?? '?'} {card.number}</span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .card-search {
    position: relative;
    margin-bottom: 16px;
    /* energy pip palette (scoped) */
    --e-g: #3fa34d; --e-r: #e0453a; --e-w: #3aa6e0; --e-l: #f2c53d; --e-p: #a24fb0;
    --e-f: #bb6b3a; --e-d: #3c4a57; --e-m: #8fa3b3; --e-n: #c79a2e; --e-c: #d8d2e8;
  }

  .field {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 10px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    transition: border-color 150ms ease;
  }
  .field.focused, .field:focus-within { border-color: var(--accent); }
  .search-icon { font-size: 14px; opacity: 0.6; flex-shrink: 0; }

  .search-input {
    flex: 1;
    min-width: 120px;
    border: none;
    background: none;
    font-size: 16px; /* keep ≥16px: prevents iOS focus-zoom */
    color: var(--text-h);
    outline: none;
  }
  .search-input::placeholder { color: var(--text); opacity: 0.5; }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 4px 3px 7px;
    background: color-mix(in srgb, var(--accent) 8%, var(--bg));
    border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
    white-space: nowrap;
  }
  .chip-body {
    display: inline-flex; align-items: center; gap: 5px;
    border: none; background: none; cursor: pointer; padding: 0;
    font: inherit; color: inherit; border-radius: 5px;
  }
  .chip-body:hover .chip-label { text-decoration: underline dotted; text-underline-offset: 2px; }
  .chip-label { line-height: 1.3; }
  .chip-x {
    display: grid;
    place-items: center;
    width: 16px; height: 16px;
    border: none; background: none; cursor: pointer;
    color: var(--subtle); font-size: 11px; border-radius: 4px;
  }
  .chip-x:hover { background: color-mix(in srgb, var(--error) 15%, transparent); color: var(--error); }

  .clear, .plus {
    flex-shrink: 0;
    display: grid; place-items: center;
    width: 28px; height: 28px;
    border-radius: 8px; cursor: pointer;
    font-size: 15px; line-height: 1;
  }
  .clear { border: none; background: none; color: var(--text); opacity: 0.55; }
  .clear:hover { opacity: 1; background: color-mix(in srgb, var(--text) 10%, transparent); }
  .plus {
    border: 1px dashed var(--accent); background: none; color: var(--accent); font-weight: 700; font-size: 17px;
  }
  .plus:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }

  /* pop panels (in-flow, expand in place) */
  .panel {
    margin-top: 8px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(30, 27, 75, 0.08);
  }
  .panel-h {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--subtle);
    border-bottom: 1px solid var(--border);
  }
  .done {
    border: 1px solid var(--accent); background: var(--accent); color: #fff;
    border-radius: 7px; padding: 4px 10px; font-size: 12px; font-weight: 700; cursor: pointer;
    text-transform: none; letter-spacing: 0;
  }
  .done:disabled { opacity: 0.4; cursor: default; }

  .menu-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 9px 12px; border: none; background: none; cursor: pointer;
    border-bottom: 1px solid var(--border);
    font-size: 14px; color: var(--text-h); text-align: left;
  }
  .menu-item:last-child { border-bottom: none; }
  .menu-item:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .mi-ic { width: 20px; text-align: center; }
  .mi-op { margin-left: auto; font: 600 12px/1 var(--mono); color: var(--subtle); }

  .egrid { display: flex; flex-wrap: wrap; gap: 7px; padding: 12px; }
  .pills { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; padding: 12px; }
  .pill {
    border: 1px solid var(--border); background: var(--bg); color: var(--text-h);
    border-radius: 999px; padding: 6px 13px; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .pill.on { background: var(--accent); border-color: var(--accent); color: #fff; }

  .suggests { display: flex; flex-direction: column; max-height: 260px; overflow-y: auto; }
  .suggest {
    padding: 9px 12px; border: none; border-top: 1px solid var(--border);
    background: none; cursor: pointer; text-align: left;
    font: 600 13.5px/1 var(--mono); color: var(--text-h);
  }
  .suggest:first-child { border-top: none; }
  .suggest:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }

  .ac-sugs { display: flex; flex-direction: column; }
  .ac-sug {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px; border: none; border-top: 1px solid var(--border);
    background: none; cursor: pointer; text-align: left;
    font-size: 13.5px; color: var(--text-h);
  }
  .ac-sug:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
  code { font: 600 12.5px/1 var(--mono); color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 5px; padding: 2px 5px; }
  .hint-sm { margin: 0; padding: 10px 12px 12px; font-size: 12px; color: var(--subtle); }

  /* energy pips */
  .pip {
    display: inline-grid; place-items: center;
    width: 22px; height: 22px; border-radius: 50%;
    font: 800 11px/1 var(--sans); color: #fff; cursor: pointer;
    border: none; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  }
  .pip.sm { width: 16px; height: 16px; font-size: 9px; cursor: default; }
  button.pip { opacity: 0.85; }
  button.pip:hover, button.pip.on { opacity: 1; outline: 2px solid var(--accent); outline-offset: 2px; }
  .pip-g { background: var(--e-g); } .pip-r { background: var(--e-r); }
  .pip-w { background: var(--e-w); } .pip-l { background: var(--e-l); color: #3a2f00; }
  .pip-p { background: var(--e-p); } .pip-f { background: var(--e-f); }
  .pip-d { background: var(--e-d); } .pip-m { background: var(--e-m); color: #26313a; }
  .pip-n { background: var(--e-n); } .pip-c { background: var(--e-c); color: #3a3350; }

  /* syntax mirror */
  .mirror {
    display: flex; align-items: center; gap: 9px;
    margin-top: 8px; padding: 7px 11px;
    background: color-mix(in srgb, var(--accent) 4%, var(--bg));
    border: 1px solid var(--border); border-radius: 9px;
  }
  .mirror-tag { font: 700 11px/1 var(--mono); color: var(--accent); flex-shrink: 0; }
  .mirror-code {
    flex: 1; min-width: 0; overflow-x: auto; white-space: nowrap;
    font: 600 13px/1.4 var(--mono); color: var(--text-h);
    background: none; padding: 0;
  }
  .mirror-edit {
    flex-shrink: 0; border: none; background: none; cursor: pointer;
    font-size: 12px; color: var(--subtle);
  }
  .mirror-edit:hover { color: var(--accent); }

  /* results — responsive grid of card images (matches the app's existing search list) */
  .rescount {
    margin-top: 10px; padding: 2px 2px 8px;
    font-size: 12px; font-weight: 600; color: var(--subtle);
  }
  .dim { opacity: 0.8; font-weight: 500; }
  .search-results {
    list-style: none;
    margin: 0;
    padding: 8px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
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
  .search-result:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .result-image { position: relative; width: 100%; }
  .result-thumb { width: 100%; display: block; border-radius: 6px; }
  .result-thumb-placeholder {
    width: 100%; aspect-ratio: 245 / 342; background: var(--skeleton); border-radius: 6px;
  }
  .result-info {
    min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center;
  }
  .result-name {
    font-size: 14px; font-weight: 600; color: var(--text-h);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  }
  .result-set { font-size: 12px; color: var(--text); opacity: 0.7; }
  .result-type-badge {
    position: absolute; top: 6px; right: 6px;
    font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px;
    color: white; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }
  .badge-pokemon { background: #7c3aed; }
  .badge-trainer { background: #0891b2; }
  .badge-energy  { background: #15803d; }

  @media (max-width: 640px) {
    .search-input { min-width: 80px; }
    .search-results {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      max-height: 65vh;
    }
    .result-name { font-size: 13px; }
    .result-set { font-size: 11px; }
  }
</style>
