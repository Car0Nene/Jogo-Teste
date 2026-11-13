import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    browserName: 'chromium',
    headless: true,
    launchOptions: {
      args: ['--no-sandbox']
    },
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 1280, height: 720 }
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
