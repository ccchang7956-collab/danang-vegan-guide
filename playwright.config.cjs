const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');

const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const useWebkit = process.env.PLAYWRIGHT_TEST_BROWSER === 'webkit';
const port = Number(process.env.PLAYWRIGHT_TEST_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;
const chromeLaunchOptions = process.env.PLAYWRIGHT_CHROME_EXECUTABLE
  ? { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE }
  : fs.existsSync(macChrome)
    ? { executablePath: macChrome }
    : { channel: 'chrome' };

module.exports = defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.cjs',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  outputDir: 'test-results/browser',
  use: {
    baseURL,
    browserName: useWebkit ? 'webkit' : 'chromium',
    headless: true,
    launchOptions: useWebkit ? {} : chromeLaunchOptions,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tests/browser/server.cjs',
    url: `${baseURL}/__test__/ready`,
    reuseExistingServer: false,
    timeout: 10_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
