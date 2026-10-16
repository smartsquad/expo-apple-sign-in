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

interface IRedirectSeed {
  result: Record<string, string>
  signedToken: boolean
}

function seedRedirectReturn(seed: IRedirectSeed): null {
  const base64url = (value: string) =>
    btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const result = { ...seed.result }
  if (seed.signedToken) {
    result.id_token = [
      base64url(JSON.stringify({ alg: 'none' })),
      base64url(JSON.stringify({ sub: '000000.e2e', email: 'e2e@example.com' })),
      'signature',
    ].join('.')
  }
  sessionStorage.setItem(
    'expo-apple-sign-in.web-pending',
    JSON.stringify({ state: 'e2e-state', rawNonce: 'e2e-raw-nonce', returnTo: '/' })
  )
  sessionStorage.setItem('expo-apple-sign-in.web-result', JSON.stringify(result))

  return null
}

test('completes a redirect return with a credential', async ({ app, screen, browser }) => {
  await app.open('/')
  await expect(screen.getByTestId('sign-in-button')).toBeVisible({ timeout: 120_000 })

  await browser.evaluate(seedRedirectReturn, {
    result: { code: 'e2e-code', state: 'e2e-state' },
    signedToken: true,
  })
  await browser.reload()

  await expect(screen.getByTestId('status-message')).toContainText('user: 000000.e2e', {
    timeout: 30_000,
  })
  await expect(screen.getByTestId('status-message')).toContainText('email: e2e@example.com')
})

test('reports a cancelled redirect return', async ({ app, screen, browser }) => {
  await app.open('/')
  await expect(screen.getByTestId('sign-in-button')).toBeVisible({ timeout: 120_000 })

  await browser.evaluate(seedRedirectReturn, {
    result: { error: 'user_cancelled_authorize', state: 'e2e-state' },
    signedToken: false,
  })
  await browser.reload()

  await expect(screen.getByTestId('status-message')).toHaveText('Canceled', { timeout: 30_000 })
})

test('rejects a redirect return with a different state', async ({ app, screen, browser }) => {
  await app.open('/')
  await expect(screen.getByTestId('sign-in-button')).toBeVisible({ timeout: 120_000 })

  await browser.evaluate(seedRedirectReturn, {
    result: { id_token: 'x.y.z', state: 'other-state' },
    signedToken: false,
  })
  await browser.reload()

  await expect(screen.getByTestId('status-message')).toHaveText(
    'Apple sign-in returned a state that does not match this page.',
    { timeout: 30_000 }
  )
})
