import { defineConfig } from '@playwright/test';

// Port is overridable via PORT so multiple git worktrees can run the dev server
// concurrently without colliding on the default 5173.
const PORT = Number(process.env.PORT) || 5173;

export default defineConfig({
  testDir: './tests',
  reporter: process.env.CI
    ? [['github'], ['json', { outputFile: 'playwright-results.json' }], ['html', { open: 'never' }]]
    : 'list',
  webServer: {
    command: `VITE_DISABLE_SNAPSHOT=true npm run dev -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  ],
});
