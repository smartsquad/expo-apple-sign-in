import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('home page', async ({ app, screen, browser }) => {
  await app.open('/')

  await expect(browser).toHaveTitle(/Expo Apple Sign In/, { timeout: 30_000 })
  await expect(screen.getByText('Sign in with Apple for Expo SDK 58 (beta)')).toBeVisible()
  await expect(screen.getByText('Requires Expo SDK 58 (beta).')).toBeVisible()
})

test('introduction page', async ({ app, screen, browser }) => {
  await app.open('/intro.html')

  await expect(browser).toHaveTitle(/Introduction/, { timeout: 30_000 })
  await expect(screen.getByRole('heading', { level: 1 })).toContainText('Introduction')
  await expect(browser).toHaveURL('/intro.html')
})

test('comparison page', async ({ app, screen, browser }) => {
  await app.open('/comparison.html')

  await expect(browser).toHaveTitle(/Comparison/, { timeout: 30_000 })
  await expect(screen.getByRole('heading', { level: 1 })).toContainText('Comparison')
})

test('installation page', async ({ app, screen, browser }) => {
  await app.open('/getting-started/installation.html')

  await expect(browser).toHaveTitle(/Installation/, { timeout: 30_000 })
  await expect(screen.getByRole('heading', { level: 1 })).toContainText('Installation')
})

test('api reference page', async ({ app, screen, browser }) => {
  await app.open('/reference/api.html')

  await expect(browser).toHaveTitle(/API/, { timeout: 30_000 })
  await expect(screen.getByRole('heading', { level: 1 })).toContainText('API')
})

test('navigation from home', async ({ app, screen, browser }) => {
  await app.open('/')

  await screen.getByRole('link', 'Start with Quick Start').tap({ timeout: 30_000 })
  await expect(browser).toHaveURL('/getting-started/quick-start.html')
})
