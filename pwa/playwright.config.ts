import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    // PGlite IdbFs needs storage access in headless browsers
    launchOptions: {
      args: ['--unlimited-storage', '--allow-file-access-from-files'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx vite --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
