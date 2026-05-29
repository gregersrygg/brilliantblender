import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Relative base so the build is agnostic to where it's hosted
  // (custom-domain root or a subpath).
  base: './',
})
