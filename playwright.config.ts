import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir: '/tmp/jlk-playwright-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/wallpaper-studio/',
    colorScheme: 'dark',
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    },
  },
  projects: [
    { name: 'iPhone', grepInvert: /WebGL context/, testIgnore: '**/shapes-unit.spec.ts', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'iPad portrait', grepInvert: /phone edits|WebGL context/, testIgnore: '**/shapes-unit.spec.ts', use: { ...devices['iPad Pro 11'], defaultBrowserType: 'chromium' } },
    { name: 'iPad landscape', grepInvert: /phone edits|WebGL context/, testIgnore: '**/shapes-unit.spec.ts', use: { ...devices['iPad Pro 11 landscape'], defaultBrowserType: 'chromium' } },
    { name: 'desktop', grepInvert: /phone edits|editable shapes/, use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: 'node tests/serve-static.mjs',
    url: 'http://127.0.0.1:4173/wallpaper-studio/',
    reuseExistingServer: !process.env.CI,
  },
});
