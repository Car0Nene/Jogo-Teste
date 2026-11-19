import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: 'list',
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'desktop-short-viewport',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 600 } },
    },
    {
      name: 'mobile-compact-portrait',
      use: { ...devices['iPhone 13'], viewport: { width: 390, height: 640 }, isMobile: true, hasTouch: true },
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: {
      args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
    },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
