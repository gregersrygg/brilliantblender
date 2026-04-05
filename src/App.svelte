<script>
  import DeckInput from './lib/DeckInput.svelte';
</script>

<main>
  <h1>Brilliant Blender</h1>
  <DeckInput onload={(text) => console.log('load', text)} />
</main>
