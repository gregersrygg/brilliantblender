<script>
  let { onconfirm, oncancel } = $props();
</script>

<div class="backdrop" onclick={oncancel} role="presentation">
  <div
    class="dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    onclick={(e) => e.stopPropagation()}
  >
    <h2 id="dialog-title">Start over?</h2>
    <p>Your current deck will be lost.</p>
    <div class="actions">
      <button class="cancel" onclick={oncancel}>Cancel</button>
      <button class="confirm" onclick={onconfirm}>Confirm</button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }

  .dialog {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 28px 32px;
    max-width: 360px;
    width: calc(100% - 32px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  }

  h2 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 800;
    color: var(--text-h);
  }

  p {
    margin: 0 0 24px;
    font-size: 14px;
    color: var(--text);
  }

  .actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .cancel {
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 600;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    background: none;
    color: var(--accent);
    cursor: pointer;
  }

  .cancel:hover {
    background: var(--border);
  }

  .confirm {
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }

  .confirm:hover {
    background: var(--accent-hover);
  }
</style>
