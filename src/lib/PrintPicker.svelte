<script>
  import { onMount } from 'svelte';
  import { fetchPrintsByName } from './api.js';

  let { cardName, clickedSetCode, clickedNumber, initialPrints, onclose } = $props();

  let pickerPrints = $state([]);
  let loading = $state(true);
  let fetchError = $state(null);
  let validationError = $state(null);

  onMount(async () => {
    try {
      const apiPrints = await fetchPrintsByName(cardName);
      pickerPrints = apiPrints.map(p => {
        const existing = initialPrints.find(
          ip => ip.setCode === p.set.ptcgoCode && ip.number === p.number
        );
        return {
          setCode: p.set.ptcgoCode,
          number: p.number,
          setName: p.set.name,
          image: p.images?.small ?? null,
          legalities: p.legalities ?? {},
          isBasicEnergy: p.supertype === 'Energy' && (p.subtypes ?? []).includes('Basic'),
          isAceSpec: (p.subtypes ?? []).includes('ACE SPEC'),
          qty: existing ? existing.qty : 0,
        };
      });
    } catch (e) {
      fetchError = e.message;
    } finally {
      loading = false;
    }
  });

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

  function legalityBadge(legalities) {
    if (legalities.standard === 'legal') return 'Standard';
    if (legalities.expanded === 'legal') return 'Expanded';
    return 'Unlimited';
  }
</script>

<div class="picker-backdrop" onclick={handleCancel} role="presentation"></div>
<aside class="print-picker" data-testid="print-picker" aria-label="Choose alternate print">
  <header class="picker-header">
    <h2>Alternate Prints — {cardName}</h2>
    <button class="close-btn" aria-label="Cancel" onclick={handleCancel}>✕</button>
  </header>

  {#if loading}
    <div class="picker-loading">Loading prints…</div>
  {:else if fetchError}
    <div class="picker-fetch-error">{fetchError}</div>
  {:else}
    <ul class="print-list">
      {#each pickerPrints as print}
        {@const isCurrent = print.setCode === clickedSetCode && print.number === clickedNumber}
        <li
          class="print-option"
          class:current={isCurrent}
          data-testid="print-option"
        >
          {#if print.image}
            <img class="print-thumb" src={print.image} alt="{cardName} {print.setCode} {print.number}" loading="lazy" />
          {/if}
          <div class="print-info">
            <span class="print-set-name">{print.setName}</span>
            <span class="print-set-code">{print.setCode} {print.number}</span>
            <span class="legality-badge">{legalityBadge(print.legalities)}</span>
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
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
  }

  .print-picker {
    position: fixed;
    top: 0;
    right: 0;
    height: 100dvh;
    width: min(420px, 100vw);
    background: var(--bg);
    border-left: 1px solid var(--border);
    z-index: 101;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: 600px) {
    .print-picker {
      top: auto;
      bottom: 0;
      right: 0;
      left: 0;
      width: 100vw;
      height: 80dvh;
      border-left: none;
      border-top: 1px solid var(--border);
      border-radius: 16px 16px 0 0;
    }
  }

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
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

  .print-list {
    list-style: none;
    margin: 0;
    padding: 8px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .print-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border: 2px solid var(--border);
    border-radius: 8px;
  }

  .print-option.current {
    border-color: var(--accent);
  }

  .print-thumb {
    width: 56px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .print-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
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

  .legality-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    border: 1px solid var(--border);
    color: var(--text);
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
</style>
