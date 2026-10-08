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
}

type TAppleJsModule = typeof import('../web/appleJs')

const EParams: TNativeSignInParams = {
  nonce: 'hashed-nonce',
  state: 'state-1',
  scopes: ['name', 'email', 'fullName'],
  clientId: 'com.example.app.service',
  redirectUri: 'https://app.example.com/callback',
}

function installBrowser(
  auth: TAppleJsAuth | null = null,
  pageHref = 'https://app.example.com/callback'
): TScriptStub {
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
  }

  const documentStub = {
    querySelector: jest.fn(() => null),
    createElement: jest.fn(() => script),
    head: {
      appendChild: jest.fn(() => {
        if (auth) {
          ;(globalThis as { AppleID?: { auth: TAppleJsAuth } }).AppleID = { auth }
        }
        script.onload?.()
      }),
    },
  }

  const pageUrl = new URL(pageHref)
  ;(globalThis as { document?: typeof documentStub }).document = documentStub
  ;(globalThis as { window?: { location: { href: string; origin: string; host: string } } }).window =
    {
      location: {
        href: pageHref,
        origin: pageUrl.origin,
        host: pageUrl.host,
      },
    }

  return script
}

function loadAppleJs(): TAppleJsModule {
  jest.resetModules()

  return require('../web/appleJs') as TAppleJsModule
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
