import { defineConfig } from '@playwright/test'
import { chromium } from 'playwright'
export default defineConfig({
  testDir: './tests/site-improvements',
  workers: 1,
  reporter: 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:3119',
    launchOptions: { executablePath: chromium.executablePath() },
  },
  webServer: {
    command: 'node --import tsx tests/fixtures/site-improvements/server.ts',
    url: 'http://127.0.0.1:3119',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
