import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('renders the example app on web', async ({ app, screen }) => {
  await app.open('/')

  await expect(screen.getByText('expo-apple-sign-in')).toBeVisible({ timeout: 120_000 })
  await expect(screen.getByTestId('platform-meta')).toContainText('web')
  await expect(screen.getByTestId('platform-meta')).toContainText('available: yes', {
    timeout: 30_000,
  })
  await expect(screen.getByRole('button', 'Sign in with Apple')).toBeVisible()
  await expect(screen.getByRole('button', 'Sign in with Apple')).toBeEnabled()
  await expect(screen.getByTestId('status-message')).toHaveText('Tap Sign in with Apple')
})

test('reports the missing web configuration', async ({ app, screen }) => {
  await app.open('/')

  await expect(screen.getByTestId('sign-in-button')).toBeVisible({ timeout: 120_000 })
  await screen.getByTestId('sign-in-button').tap()
  await expect(screen.getByTestId('status-message')).toHaveText(
    'AppleAuth.configure({ clientId, redirectUri }) is required on web. clientId is the Apple Services ID.',
    { timeout: 30_000 }
  )
})
