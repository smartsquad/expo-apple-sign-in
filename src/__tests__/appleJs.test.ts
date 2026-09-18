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

function installBrowser(auth: TAppleJsAuth | null = null): TScriptStub {
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

  ;(globalThis as { document?: typeof documentStub }).document = documentStub

  return script
}

function loadAppleJs(): TAppleJsModule {
  jest.resetModules()

  return require('../web/appleJs') as TAppleJsModule
}

afterEach(() => {
  delete (globalThis as { document?: unknown }).document
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

  it('maps fullName to name, inits Apple JS, and returns the credential', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({
        authorization: { id_token: 'jwt', code: 'auth-code', state: 'echo' },
        user: { email: 'ada@example.com', name: { firstName: 'Ada', lastName: 'Lovelace' } },
      }),
    }
    installBrowser(auth)
    const { webSignIn } = loadAppleJs()
    const result = await webSignIn(EParams)

    expect(auth.init).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: EParams.clientId,
        redirectURI: EParams.redirectUri,
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
