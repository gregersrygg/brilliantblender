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
    padding: 10px 24px;
    font-size: 16px;
    font-weight: 500;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-h);
    cursor: pointer;
  }

  .export-button:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
