import { defineConfig } from '@playwright/test'
import { chromium } from 'playwright'

export default defineConfig({
  testDir: './tests/event-registration',
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3121',
    launchOptions: { executablePath: chromium.executablePath() },
  },
  webServer: {
    command: 'node --import tsx tests/fixtures/event-registration/server.ts',
    url: 'http://127.0.0.1:3121',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
