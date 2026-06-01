import { render } from 'svelte/server';
import App from './App.svelte';

// Prerender the landing/empty state at build time. App has no <svelte:head>,
// so `head` comes back empty; `body` is injected into #app by scripts/prerender.mjs.
export function renderApp() {
  return render(App);
}
