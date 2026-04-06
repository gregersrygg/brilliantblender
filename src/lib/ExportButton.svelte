<script>
  let { onexport } = $props();
  let copied = $state(false);

  async function handleClick() {
    const text = onexport();
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }
</script>

<button class="export-button" onclick={handleClick}>
  {copied ? 'Copied!' : 'Export Decklist'}
</button>

<style>
  .export-button {
    padding: 7px 16px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    cursor: pointer;
    transition: background 150ms ease;
  }

  .export-button:hover {
    background: var(--accent-hover);
  }
</style>
