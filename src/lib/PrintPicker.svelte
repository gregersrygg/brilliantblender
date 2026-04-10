<script>
  import { onMount } from 'svelte';
  import { fetchPrintsByName, getPtcgoCode } from './api.js';
  import { LEGAL_REGULATION_MARKS } from './config.js';

  let { cardName, clickedSetCode, clickedNumber, initialPrints, onclose } = $props();

  let pickerPrints = $state([]);
  const samePrints = $derived(pickerPrints.filter(p => p.sameText));
  const diffPrints = $derived(pickerPrints.filter(p => !p.sameText));
  const showGroups = $derived(samePrints.length > 0 && diffPrints.length > 0);
  let loading = $state(true);
  let fetchError = $state(null);
  let validationError = $state(null);
  let selectedPrint = $state(null);
  let mobileTab = $state('list'); // 'list' | 'detail'

  function normalizeAttacks(attacks) {
    if (!attacks || attacks.length === 0) return '[]';
    return JSON.stringify(
      [...attacks]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => ({
          name: a.name,
          damage: a.damage ?? '',
          cost: [...(a.cost ?? [])].sort().join(','),
          text: a.text ?? '',
        }))
    );
  }

  function normalizeAbilities(abilities) {
    if (!abilities || abilities.length === 0) return '[]';
    return JSON.stringify(
      [...abilities]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => ({ name: a.name, text: a.text ?? '' }))
    );
  }

  function isFunctionalReprint(card, legalPrints) {
    if (legalPrints.length === 0) return false;
    return legalPrints.some(
      legal =>
        card.hp === legal.hp &&
        normalizeAttacks(card.attacks) === normalizeAttacks(legal.attacks) &&
        normalizeAbilities(card.abilities) === normalizeAbilities(legal.abilities)
    );
  }

  function legalityBadge(legalities) {
    if (legalities?.standard === 'legal') return 'Standard';
    if (legalities?.expanded === 'legal') return 'Expanded';
    return 'Unlimited';
  }

  function matchQty(p) {
    const existing = initialPrints.find(ip => {
      const numberMatch = ip.number === p.number;
      if (!numberMatch) return false;
      if (ip.setId && p.setId) return ip.setId === p.setId;
      return ip.setCode === p.setCode;
    });
    return existing ? existing.qty : 0;
  }

  onMount(async () => {
    try {
      const apiPrints = await fetchPrintsByName(cardName);

      // Build legal print list for functional-reprint detection
      const legalForComparison = apiPrints
        .filter(p => LEGAL_REGULATION_MARKS.includes(p.regulationMark))
        .map(p => ({ hp: p.hp, attacks: p.attacks, abilities: p.abilities }));

      // Reference card: the one that was clicked, used to group same/different text
      const refCard = apiPrints.find(
        p => (p.set.ptcgoCode ?? getPtcgoCode(p.set.id) ?? '') === clickedSetCode && p.number === clickedNumber
      );
      const refFingerprint = refCard
        ? { hp: refCard.hp, attacks: refCard.attacks, abilities: refCard.abilities }
        : null;

      pickerPrints = apiPrints.map(p => {
        const mark = p.regulationMark ?? null;
        const isLegal =
          LEGAL_REGULATION_MARKS.includes(mark) ||
          isFunctionalReprint(p, legalForComparison);
        const resolvedCode = p.set.ptcgoCode ?? getPtcgoCode(p.set.id) ?? '';
        const qty = matchQty({ setCode: resolvedCode, setId: p.set.id ?? '', number: p.number });
        const sameText = refFingerprint
          ? p.hp === refFingerprint.hp &&
            normalizeAttacks(p.attacks) === normalizeAttacks(refFingerprint.attacks) &&
            normalizeAbilities(p.abilities) === normalizeAbilities(refFingerprint.abilities)
          : true;
        return {
          setCode: resolvedCode,
          setId: p.set.id ?? '',
          number: p.number,
          setName: p.set.name,
          image: p.images?.small ?? null,
          largeImage: p.images?.large ?? null,
          legalities: p.legalities ?? {},
          isBasicEnergy: p.supertype === 'Energy' && (p.subtypes ?? []).includes('Basic'),
          isAceSpec: (p.subtypes ?? []).includes('ACE SPEC'),
          regulationMark: mark,
          isLegal,
          hp: p.hp ?? null,
          supertype: p.supertype ?? null,
          attacks: p.attacks ?? [],
          abilities: p.abilities ?? [],
          qty,
          sameText,
        };
      }).filter(p => p.isLegal || p.qty > 0);

      // Pre-select the clicked card
      selectedPrint =
        pickerPrints.find(p => p.setCode === clickedSetCode && p.number === clickedNumber) ??
        pickerPrints[0] ??
        null;
    } catch (e) {
      fetchError = e.message;
    } finally {
      loading = false;
    }
  });

  function selectPrint(print) {
    selectedPrint = print;
    mobileTab = 'detail';
  }

  function increment(print) {
    print.qty++;
    validationError = null;
  }

  function decrement(print) {
    if (print.qty > 0) {
      print.qty--;
      validationError = null;
    }
  }

  function handleDone() {
    const isBasicEnergy = pickerPrints.some(p => p.isBasicEnergy);
    const total = pickerPrints.reduce((sum, p) => sum + p.qty, 0);
    if (!isBasicEnergy && total > 4) {
      validationError = `Max 4 copies of "${cardName}" allowed (you have ${total})`;
      return;
    }
    onclose(pickerPrints);
  }

  function handleCancel() {
    onclose(null);
  }

  function energyCostDisplay(cost) {
    if (!cost || cost.length === 0) return '';
    const symbols = { Fire: '🔥', Water: '💧', Grass: '🌿', Lightning: '⚡', Psychic: '🔮',
      Fighting: '✊', Darkness: '🌑', Metal: '⚙️', Dragon: '🐲', Fairy: '🌸', Colorless: '⬜' };
    return cost.map(c => symbols[c] ?? c).join('');
  }
</script>

<div class="picker-backdrop" onclick={handleCancel} role="presentation"></div>
<aside class="print-picker" data-testid="print-picker" aria-label="Choose alternate print">
  <header class="picker-header">
    <h2>Alternate Prints — {cardName}</h2>
    <button class="close-btn" aria-label="Cancel" onclick={handleCancel}>✕</button>
  </header>

  <!-- Mobile tab bar -->
  <div class="mobile-tabs" role="tablist">
    <button
      class="mobile-tab"
      class:active={mobileTab === 'list'}
      role="tab"
      onclick={() => (mobileTab = 'list')}
    >Prints</button>
    <button
      class="mobile-tab"
      class:active={mobileTab === 'detail'}
      role="tab"
      onclick={() => (mobileTab = 'detail')}
      disabled={!selectedPrint}
    >Details</button>
  </div>

  <div class="picker-body">
    <!-- Left: print list -->
    <div class="print-list-col" class:hidden-mobile={mobileTab !== 'list'}>
      {#if loading}
        <div class="picker-loading">Loading prints…</div>
      {:else if fetchError}
        <div class="picker-fetch-error">{fetchError}</div>
      {:else}
        <ul class="print-list">
          {#if showGroups}
            <li class="group-header" data-testid="group-header-same">Same card text</li>
          {/if}
          {#each samePrints as print}
            {@const isCurrent = print.setCode === clickedSetCode && print.number === clickedNumber}
            {@const isSelected = selectedPrint === print}
            <li
              class="print-option"
              class:current={isCurrent}
              class:selected={isSelected}
              class:illegal={!print.isLegal}
              data-testid="print-option"
            >
              <button class="print-image-btn" onclick={() => selectPrint(print)} aria-label="View {print.setName} {print.number}">
                {#if print.image}
                  <img class="print-thumb" src={print.image} alt="{cardName} {print.setCode} {print.number}" loading="lazy" />
                {:else}
                  <div class="print-thumb-placeholder"></div>
                {/if}
              </button>
              <div class="print-info">
                <span class="print-set-name">{print.setName}</span>
                <span class="print-set-code">{print.setCode} {print.number}</span>
                <div class="print-badges">
                  <span class="legality-badge">{legalityBadge(print.legalities)}</span>
                  {#if print.regulationMark}
                    <span class="reg-badge" class:reg-badge-illegal={!print.isLegal}>{print.regulationMark}</span>
                  {/if}
                  {#if !print.isLegal}
                    <span class="illegal-badge">Not Standard-legal</span>
                  {/if}
                </div>
              </div>
              <div class="print-qty-controls">
                <button
                  class="qty-btn"
                  data-testid="print-decrement"
                  onclick={() => decrement(print)}
                  disabled={print.qty === 0}
                >−</button>
                <span class="print-qty" data-testid="print-qty">{print.qty}</span>
                <button
                  class="qty-btn"
                  data-testid="print-increment"
                  onclick={() => increment(print)}
                >+</button>
              </div>
            </li>
          {/each}
          {#if showGroups}
            <li class="group-header" data-testid="group-header-diff">Different card text</li>
          {/if}
          {#each diffPrints as print}
            {@const isCurrent = print.setCode === clickedSetCode && print.number === clickedNumber}
            {@const isSelected = selectedPrint === print}
            <li
              class="print-option"
              class:current={isCurrent}
              class:selected={isSelected}
              class:illegal={!print.isLegal}
              data-testid="print-option"
            >
              <button class="print-image-btn" onclick={() => selectPrint(print)} aria-label="View {print.setName} {print.number}">
                {#if print.image}
                  <img class="print-thumb" src={print.image} alt="{cardName} {print.setCode} {print.number}" loading="lazy" />
                {:else}
                  <div class="print-thumb-placeholder"></div>
                {/if}
              </button>
              <div class="print-info">
                <span class="print-set-name">{print.setName}</span>
                <span class="print-set-code">{print.setCode} {print.number}</span>
                <div class="print-badges">
                  <span class="legality-badge">{legalityBadge(print.legalities)}</span>
                  {#if print.regulationMark}
                    <span class="reg-badge" class:reg-badge-illegal={!print.isLegal}>{print.regulationMark}</span>
                  {/if}
                  {#if !print.isLegal}
                    <span class="illegal-badge">Not Standard-legal</span>
                  {/if}
                </div>
              </div>
              <div class="print-qty-controls">
                <button
                  class="qty-btn"
                  data-testid="print-decrement"
                  onclick={() => decrement(print)}
                  disabled={print.qty === 0}
                >−</button>
                <span class="print-qty" data-testid="print-qty">{print.qty}</span>
                <button
                  class="qty-btn"
                  data-testid="print-increment"
                  onclick={() => increment(print)}
                >+</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Right: card detail panel -->
    <div class="detail-panel" class:hidden-mobile={mobileTab !== 'detail'}>
      {#if selectedPrint}
        <div class="detail-scroll">
          <div class="detail-image-wrap">
            {#if selectedPrint.largeImage}
              <img class="detail-card-img" src={selectedPrint.largeImage} alt="{cardName} {selectedPrint.setCode} {selectedPrint.number}" loading="lazy" />
            {:else if selectedPrint.image}
              <img class="detail-card-img" src={selectedPrint.image} alt="{cardName}" loading="lazy" />
            {/if}
          </div>
          <div class="detail-info">
            <div class="detail-header-row">
              <span class="detail-name">{cardName}</span>
              {#if selectedPrint.hp}
                <span class="detail-hp">HP {selectedPrint.hp}</span>
              {/if}
            </div>
            {#if selectedPrint.supertype}
              <span class="detail-supertype">{selectedPrint.supertype}</span>
            {/if}
            {#if selectedPrint.abilities && selectedPrint.abilities.length > 0}
              <div class="detail-section">
                {#each selectedPrint.abilities as ability}
                  <div class="ability-block">
                    <span class="ability-type">{ability.type ?? 'Ability'}</span>
                    <span class="ability-name">{ability.name}</span>
                    {#if ability.text}
                      <p class="ability-text">{ability.text}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
            {#if selectedPrint.attacks && selectedPrint.attacks.length > 0}
              <div class="detail-section">
                {#each selectedPrint.attacks as attack}
                  <div class="attack-block">
                    <div class="attack-header">
                      <span class="attack-cost">{energyCostDisplay(attack.cost)}</span>
                      <span class="attack-name">{attack.name}</span>
                      {#if attack.damage}
                        <span class="attack-damage">{attack.damage}</span>
                      {/if}
                    </div>
                    {#if attack.text}
                      <p class="attack-text">{attack.text}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
            <div class="detail-meta">
              <span class="detail-set">{selectedPrint.setName} · {selectedPrint.setCode} {selectedPrint.number}</span>
              {#if selectedPrint.regulationMark}
                <span class="reg-badge">{selectedPrint.regulationMark}</span>
              {/if}
              <span class="legality-badge">{legalityBadge(selectedPrint.legalities)}</span>
            </div>
          </div>
        </div>
      {:else}
        <div class="detail-empty">Select a print to see details</div>
      {/if}
    </div>
  </div>

  {#if validationError}
    <div class="picker-error" data-testid="picker-error" role="alert">{validationError}</div>
  {/if}

  <footer class="picker-footer">
    <button class="btn-done" onclick={handleDone}>Done</button>
    <button class="btn-cancel" onclick={handleCancel}>Cancel</button>
  </footer>
</aside>

<style>
  .picker-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .print-picker {
    position: fixed;
    inset: 0;
    background: var(--bg);
    z-index: 101;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Header ── */
  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .picker-header h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: var(--text-h);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: var(--text);
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
  }

  /* ── Mobile tab bar (hidden on desktop) ── */
  .mobile-tabs {
    display: none;
  }

  /* ── Body: two-column on desktop ── */
  .picker-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* ── Left: print list ── */
  .print-list-col {
    width: 380px;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .print-list {
    list-style: none;
    margin: 0;
    padding: 8px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .group-header {
    font-size: 0.7rem;
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: var(--text-muted, #888);
    padding: 6px 4px 2px;
    margin-top: 4px;
    list-style: none;
    border-bottom: 1px solid var(--border);
  }

  .print-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border: 2px solid var(--border);
    border-radius: 8px;
    transition: border-color 100ms ease;
  }

  .print-option.current {
    border-color: var(--accent);
  }

  .print-option.selected {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: var(--accent);
  }

  .print-option.illegal {
    opacity: 0.55;
  }

  .print-option.illegal.selected,
  .print-option.illegal.current {
    opacity: 1;
  }

  .print-image-btn {
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .print-image-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .print-thumb {
    width: 72px;
    border-radius: 4px;
    display: block;
  }

  .print-thumb-placeholder {
    width: 72px;
    aspect-ratio: 245 / 342;
    background: var(--skeleton);
    border-radius: 4px;
  }

  .print-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .print-set-name {
    font-size: 12px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .print-set-code {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
  }

  .print-badges {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .legality-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    border: 1px solid var(--border);
    color: var(--text);
    align-self: flex-start;
  }

  .reg-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--accent);
    color: white;
    font-weight: 700;
    align-self: flex-start;
  }

  .reg-badge-illegal {
    background: var(--error);
  }

  .illegal-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    border: 1px solid var(--error);
    color: var(--error);
    align-self: flex-start;
  }

  .print-qty-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .qty-btn {
    padding: 2px 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
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

  .print-qty {
    font-size: 15px;
    font-weight: 600;
    min-width: 20px;
    text-align: center;
    color: var(--text-h);
  }

  /* ── Right: detail panel ── */
  .detail-panel {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .detail-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .detail-image-wrap {
    display: flex;
    justify-content: center;
    padding: 20px 20px 12px;
    background: color-mix(in srgb, var(--border) 30%, transparent);
  }

  .detail-card-img {
    max-height: 50vh;
    max-width: 100%;
    width: auto;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.25);
  }

  .detail-info {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .detail-header-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .detail-name {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-h);
  }

  .detail-hp {
    font-size: 14px;
    font-weight: 700;
    color: var(--accent);
    white-space: nowrap;
  }

  .detail-supertype {
    font-size: 12px;
    color: var(--text);
    opacity: 0.7;
    margin-top: -6px;
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 4px;
    border-top: 1px solid var(--border);
  }

  .ability-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ability-type {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--accent);
  }

  .ability-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
  }

  .ability-text {
    margin: 0;
    font-size: 12px;
    color: var(--text);
    line-height: 1.5;
  }

  .attack-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .attack-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .attack-cost {
    font-size: 13px;
    flex-shrink: 0;
  }

  .attack-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
    flex: 1;
  }

  .attack-damage {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-h);
  }

  .attack-text {
    margin: 0;
    font-size: 12px;
    color: var(--text);
    line-height: 1.5;
  }

  .detail-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding-top: 4px;
    border-top: 1px solid var(--border);
  }

  .detail-set {
    font-size: 11px;
    color: var(--text);
    opacity: 0.7;
    flex: 1;
  }

  .detail-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 14px;
    color: var(--text);
    opacity: 0.5;
  }

  /* ── Footer ── */
  .picker-error {
    margin: 0 16px 8px;
    padding: 8px 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error);
    border-radius: 6px;
    color: var(--error);
    font-size: 13px;
    flex-shrink: 0;
  }

  .picker-footer {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .btn-done {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-cancel {
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 15px;
    cursor: pointer;
  }

  .picker-loading {
    padding: 32px;
    text-align: center;
    color: var(--text);
  }

  .picker-fetch-error {
    padding: 16px;
    color: var(--error);
  }

  .picker-no-results {
    padding: 24px 16px;
    font-size: 13px;
    color: var(--text);
    opacity: 0.7;
    line-height: 1.5;
  }

  /* ── Mobile layout ── */
  @media (max-width: 700px) {
    .mobile-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .mobile-tab {
      flex: 1;
      padding: 10px;
      border: none;
      background: none;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 150ms ease, border-color 150ms ease;
    }

    .mobile-tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    .mobile-tab:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .print-list-col {
      width: 100%;
      border-right: none;
    }

    .detail-panel {
      width: 100%;
    }

    .hidden-mobile {
      display: none;
    }

    .detail-card-img {
      max-height: 45vw;
    }
  }
</style>
