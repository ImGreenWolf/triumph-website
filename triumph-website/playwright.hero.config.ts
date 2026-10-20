import { defineConfig, devices } from '@playwright/test'
import { chromium } from 'playwright'

export default defineConfig({
  testDir: './tests/hero',
  workers: 1,
  timeout: 30_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3118',
    launchOptions: { executablePath: chromium.executablePath() },
  },
  webServer: {
    command: 'node --import tsx tests/fixtures/hero/server.ts',
    url: 'http://127.0.0.1:3118',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
