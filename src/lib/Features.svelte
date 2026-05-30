<script>
  const features = [
    {
      icon: '🔄',
      title: 'Swap prints effortlessly',
      body: 'The reason Brilliant Blender exists. Tap any Pokémon to see every print and swap in the exact set and number you’ll bring to the table — no fiddling, no friction.',
    },
    {
      icon: '§',
      title: 'Tournament-legality built in',
      body: 'We flag cards from sets that aren’t legal yet and apply the reprint rule (§4.1.3) automatically, so your exported list passes deck check.',
    },
    {
      icon: '🌱',
      title: 'Beginner-friendly, not limiting',
      body: 'New to deck check? The visual flow walks you through it. Already know the ropes? Nothing slows you down — paste, adjust, and export in seconds.',
    },
  ];
</script>

<section class="features" aria-label="Why Brilliant Blender">
  <h2>Why Brilliant Blender?</h2>
  <div class="grid">
    {#each features as feature}
      <div class="feature">
        <h3><span class="icon" aria-hidden="true">{feature.icon}</span>{feature.title}</h3>
        <p>{feature.body}</p>
      </div>
    {/each}
  </div>
</section>

<style>
  .features {
    max-width: 900px;
    margin: 48px auto 0;
  }

  h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-h);
    text-align: center;
    margin: 0 0 24px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .feature {
    padding: 18px 20px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
  }

  .icon {
    font-size: 20px;
    line-height: 1;
    color: var(--text-h);
  }

  .feature h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    color: var(--accent);
    margin: 0 0 8px;
  }

  .feature p {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text);
    margin: 0;
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
