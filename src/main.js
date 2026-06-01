import { mount, hydrate } from 'svelte'
import './app.css'
import App from './App.svelte'

const target = document.getElementById('app')

// In production the landing state is prerendered into #app at build time
// (scripts/prerender.mjs), so we hydrate that markup. In dev — and any time
// #app is empty — there is nothing to hydrate, so render fresh.
const app = target.hasChildNodes()
  ? hydrate(App, { target })
  : mount(App, { target })

export default app
