import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

// Nạp account seed + địa chỉ backend thật từ `.env.test` (file local, đã bị gitignore).
// Dùng API có sẵn của Node (process.loadEnvFile, Node >= 20.12) nên không thêm dependency.
// Biến đã set sẵn trong shell sẽ thắng giá trị trong file.
const envTestPath = resolve(dirname(fileURLToPath(import.meta.url)), '.env.test')
if (existsSync(envTestPath)) {
  process.loadEnvFile(envTestPath)
}

const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/config.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'chromium-mobile',
      testMatch: /auth\/login-(form|outcome)\.spec\.ts/, // chỉ /login responsive được (D-8)
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_API_BASE_URL: process.env.E2E_API_BASE_URL || BASE_URL }, // P-4 + G-3
  },
})
