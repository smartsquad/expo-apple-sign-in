import { EAppleAuthErrorCode } from '../errors'
import type { TNativeSignInParams } from '../types'

type TAppleJsAuth = {
  init: jest.Mock
  signIn: jest.Mock
}

type TScriptStub = {
  src: string
  async: boolean
  onload: (() => void) | null
  onerror: (() => void) | null
  addEventListener: (name: string, fn: () => void) => void
  remove: () => void
}

type TDocumentStub = {
  querySelector: jest.Mock
  createElement: jest.Mock
  head: { appendChild: jest.Mock }
}

type TBrowserStub = {
  document: TDocumentStub
  attached: () => TScriptStub | null
}

type TAppleJsModule = typeof import('../web/appleJs')

const EParams: TNativeSignInParams = {
  nonce: 'hashed-nonce',
  state: 'state-1',
  scopes: ['name', 'email', 'fullName'],
  clientId: 'com.example.app.service',
  redirectUri: 'https://app.example.com/callback',
}

function createScriptStub(): TScriptStub {
  const script: TScriptStub = {
    src: '',
    async: false,
    onload: null,
    onerror: null,
    addEventListener: (name, fn) => {
      if (name === 'load') {
        script.onload = fn
      }
      if (name === 'error') {
        script.onerror = fn
      }
    },
    remove: () => {},
  }

  return script
}

/**
 * Appending a script loads it only when `auth` is given, so tests without `auth` can fire the
 * script's load and error events themselves.
 */
function installBrowser(
  auth: TAppleJsAuth | null = null,
  pageHref = 'https://app.example.com/callback'
): TBrowserStub {
  let attached: TScriptStub | null = null
  const documentStub: TDocumentStub = {
    querySelector: jest.fn(() => attached),
    createElement: jest.fn(() => createScriptStub()),
    head: {
      appendChild: jest.fn((script: TScriptStub) => {
        attached = script
        script.remove = () => {
          attached = null
        }
        if (auth) {
          ;(globalThis as { AppleID?: { auth: TAppleJsAuth } }).AppleID = { auth }
          script.onload?.()
        }
      }),
    },
  }

  const pageUrl = new URL(pageHref)
  ;(globalThis as { document?: typeof documentStub }).document = documentStub
  ;(
    globalThis as { window?: { location: { href: string; origin: string; host: string } } }
  ).window = {
    location: {
      href: pageHref,
      origin: pageUrl.origin,
      host: pageUrl.host,
    },
  }

  return { document: documentStub, attached: () => attached }
}

function loadAppleJs(): TAppleJsModule {
  jest.resetModules()

  return require('../web/appleJs') as TAppleJsModule
}

function rejectingAuth(rejection: unknown): TAppleJsAuth {
  return { init: jest.fn(), signIn: jest.fn().mockRejectedValue(rejection) }
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected the promise to reject')
}

afterEach(() => {
  delete (globalThis as { document?: unknown }).document
  delete (globalThis as { window?: unknown }).window
  delete (globalThis as { AppleID?: unknown }).AppleID
})

describe('isWebAppleAvailable', () => {
  it('is false without a document', () => {
    const { isWebAppleAvailable } = loadAppleJs()
    expect(isWebAppleAvailable()).toBe(false)
  })

  it('is true in a browser document', () => {
    installBrowser()
    const { isWebAppleAvailable } = loadAppleJs()
    expect(isWebAppleAvailable()).toBe(true)
  })
})

describe('webSignIn', () => {
  it('requires clientId and redirectUri', async () => {
    const { webSignIn } = loadAppleJs()
    try {
      await webSignIn({ ...EParams, clientId: undefined })
      throw new Error('expected clientId to be required')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.NotConfigured })
    }
    try {
      await webSignIn({ ...EParams, redirectUri: undefined })
      throw new Error('expected redirectUri to be required')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.NotConfigured })
    }
  })

  it('rejects a redirectUri on a different origin than the Expo web page', async () => {
    installBrowser(null, 'https://app.example.com/')
    const { webSignIn } = loadAppleJs()
    try {
      await webSignIn({
        ...EParams,
        redirectUri: 'https://example.com/auth/callback',
      })
      throw new Error('expected cross-origin redirectUri to fail')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.NotConfigured })
      expect(String((error as Error).message)).toMatch(/\(https:\/\/example\.com\)/)
      expect(String((error as Error).message)).toMatch(/\(https:\/\/app\.example\.com\)/)
    }
  })

  it('maps fullName to name, inits Apple JS, and returns the credential', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({
        authorization: { id_token: 'jwt', code: 'auth-code', state: 'echo' },
        user: { email: 'ada@example.com', name: { firstName: 'Ada', lastName: 'Lovelace' } },
      }),
    }
    installBrowser(auth, 'https://app.example.com/callback')
    const { webSignIn } = loadAppleJs()
    const result = await webSignIn(EParams)

    expect(auth.init).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: EParams.clientId,
        redirectURI: 'https://app.example.com/callback',
        scope: 'name email',
        nonce: 'hashed-nonce',
        usePopup: true,
      })
    )
    expect(result).toEqual({
      identityToken: 'jwt',
      authorizationCode: 'auth-code',
      user: null,
      state: 'echo',
      email: 'ada@example.com',
      givenName: 'Ada',
      familyName: 'Lovelace',
      realUserStatus: 'unknown',
    })
  })

  it('maps a closed popup to ERR_REQUEST_CANCELED', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockRejectedValue(new Error('popup closed by user')),
    }
    installBrowser(auth)
    const { webSignIn } = loadAppleJs()
    try {
      await webSignIn(EParams)
      throw new Error('expected popup close to cancel')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.Canceled })
    }
  })

  it.each(['popup_closed_by_user', 'user_cancelled_authorize'])(
    'maps the Apple JS %s rejection to ERR_REQUEST_CANCELED',
    async (code) => {
      installBrowser(rejectingAuth({ error: code }))
      const { webSignIn } = loadAppleJs()

      const error = await rejectionOf(webSignIn(EParams))

      expect(error).toMatchObject({ name: 'AppleAuthError', code: EAppleAuthErrorCode.Canceled })
    }
  )

  it('maps a blocked popup to ERR_REQUEST_FAILED', async () => {
    installBrowser(rejectingAuth({ error: 'popup_blocked_by_browser' }))
    const { webSignIn } = loadAppleJs()

    const error = await rejectionOf(webSignIn(EParams))

    expect(error).toMatchObject({ name: 'AppleAuthError', code: EAppleAuthErrorCode.Failed })
    expect((error as Error).message).toMatch(/popup/)
  })

  it('maps other Apple JS rejections to ERR_REQUEST_UNKNOWN with the Apple code', async () => {
    const rejection = { error: 'invalid_request' }
    installBrowser(rejectingAuth(rejection))
    const { webSignIn } = loadAppleJs()

    const error = await rejectionOf(webSignIn(EParams))

    expect(error).toMatchObject({ name: 'AppleAuthError', code: EAppleAuthErrorCode.Unknown })
    expect((error as Error).message).toContain('invalid_request')
    expect((error as Error).message).not.toContain('[object Object]')
    expect((error as { cause?: unknown }).cause).toBe(rejection)
  })

  it('maps a thrown Error to ERR_REQUEST_UNKNOWN with its message', async () => {
    const boom = new Error('boom')
    installBrowser(rejectingAuth(boom))
    const { webSignIn } = loadAppleJs()

    const error = await rejectionOf(webSignIn(EParams))

    expect(error).toMatchObject({ name: 'AppleAuthError', code: EAppleAuthErrorCode.Unknown })
    expect((error as Error).message).toContain('boom')
    expect((error as { cause?: unknown }).cause).toBe(boom)
  })

  it('loads the Apple JS SDK again after a script error', async () => {
    const browser = installBrowser()
    const { webSignIn } = loadAppleJs()

    const first = webSignIn(EParams)
    const firstScript = browser.attached()
    expect(firstScript).not.toBeNull()
    firstScript?.onerror?.()

    await expect(first).rejects.toMatchObject({
      name: 'AppleAuthError',
      code: EAppleAuthErrorCode.NotAvailable,
    })
    expect(browser.document.createElement).toHaveBeenCalledTimes(1)
    expect(browser.attached()).toBeNull()

    const second = webSignIn(EParams)
    expect(browser.document.createElement).toHaveBeenCalledTimes(2)
    const secondScript = browser.attached()
    expect(secondScript).not.toBeNull()
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({ authorization: { id_token: 'jwt' } }),
    }
    ;(globalThis as { AppleID?: { auth: TAppleJsAuth } }).AppleID = { auth }
    secondScript?.onload?.()

    await expect(second).resolves.toMatchObject({ identityToken: 'jwt' })
  })

  it('detaches an existing Apple JS script that fails to load and rejects', async () => {
    const browser = installBrowser()
    const existing = createScriptStub()
    browser.document.head.appendChild(existing)
    const { webSignIn } = loadAppleJs()

    const pending = webSignIn(EParams)
    existing.onerror?.()

    await expect(pending).rejects.toMatchObject({
      name: 'AppleAuthError',
      code: EAppleAuthErrorCode.NotAvailable,
    })
    expect(browser.attached()).toBeNull()
    expect(browser.document.createElement).not.toHaveBeenCalled()
  })

  it('throws when Apple JS returns no identity token', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({ authorization: { code: 'only-code' } }),
    }
    installBrowser(auth)
    const { webSignIn } = loadAppleJs()
    try {
      await webSignIn(EParams)
      throw new Error('expected missing token to throw')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.MissingIdentityToken })
    }
  })
})
