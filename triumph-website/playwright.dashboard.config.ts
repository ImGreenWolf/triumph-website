import { defineConfig, devices } from '@playwright/test'
import { chromium } from 'playwright'

export default defineConfig({
  testDir: './tests/dashboard',
  testMatch: 'dashboard-layout.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3117',
    launchOptions: { executablePath: chromium.executablePath() },
  },
  webServer: {
    command: 'node --import tsx tests/fixtures/dashboard/server.tsx',
    url: 'http://127.0.0.1:3117/interactive',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
