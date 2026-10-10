import { Platform } from 'react-native'

import { AppleAuth, subscribeToConfig } from '../AppleAuth'
import { EAppleAuthErrorCode } from '../errors'
import { getNativeAppleModule } from '../native-module'
import { sha256Hex } from '../nonce'
import type { TExpoAppleSignInNativeModule, TNativeSignInResult } from '../types'
import { isWebAppleAvailable, webSignIn } from '../web/appleJs'

jest.mock('../native-module', () => ({
  getNativeAppleModule: jest.fn(),
}))

jest.mock('../web/appleJs', () => ({
  isWebAppleAvailable: jest.fn(),
  webSignIn: jest.fn(),
}))

const getNative = getNativeAppleModule as jest.MockedFunction<typeof getNativeAppleModule>
const webAvailable = isWebAppleAvailable as jest.MockedFunction<typeof isWebAppleAvailable>
const webSign = webSignIn as jest.MockedFunction<typeof webSignIn>

const nativeResult: TNativeSignInResult = {
  identityToken: 'native.jwt.token',
  authorizationCode: 'code',
  user: 'user-1',
  email: 'ada@example.com',
  givenName: 'Ada',
  familyName: 'Lovelace',
  state: 'state-1',
  realUserStatus: 'likelyReal',
}

function nativeModule(
  overrides: Partial<TExpoAppleSignInNativeModule> = {}
): TExpoAppleSignInNativeModule {
  return {
    isAvailable: () => true,
    signIn: jest.fn().mockResolvedValue(nativeResult),
    getCredentialState: jest.fn().mockResolvedValue('authorized'),
    ...overrides,
  }
}

async function resetAuth(): Promise<void> {
  AppleAuth.configure({
    clientId: '',
    redirectUri: '',
    scopes: ['name', 'email'],
  })
  await AppleAuth.signOut()
}

beforeEach(async () => {
  Platform.OS = 'ios'
  getNative.mockReset()
  webAvailable.mockReset()
  webSign.mockReset()
  webAvailable.mockReturnValue(true)
  await resetAuth()
})

describe('AppleAuth.configure', () => {
  it('is always configured on iOS', () => {
    Platform.OS = 'ios'
    expect(AppleAuth.isConfigured()).toBe(true)
  })

  it('requires clientId and redirectUri on Android and web', () => {
    Platform.OS = 'android'
    expect(AppleAuth.isConfigured()).toBe(false)
    AppleAuth.configure({
      clientId: 'com.example.app.service',
      redirectUri: 'https://app.example.com/callback',
    })
    expect(AppleAuth.isConfigured()).toBe(true)
    expect(AppleAuth.getConfig()).toEqual({
      clientId: 'com.example.app.service',
      redirectUri: 'https://app.example.com/callback',
      scopes: ['name', 'email'],
    })

    Platform.OS = 'web'
    expect(AppleAuth.isConfigured()).toBe(true)
  })

  it('keeps stored values when a field is undefined', () => {
    AppleAuth.configure({
      clientId: 'com.example.app.web',
      redirectUri: 'https://app.example.com/callback',
    })
    AppleAuth.configure({ clientId: undefined, redirectUri: undefined, scopes: ['email'] })
    expect(AppleAuth.getConfig()).toEqual({
      clientId: 'com.example.app.web',
      redirectUri: 'https://app.example.com/callback',
      scopes: ['email'],
    })
  })
})

describe('subscribeToConfig', () => {
  it('runs the listener once per configure call until it unsubscribes', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeToConfig(listener)

    AppleAuth.configure({ clientId: 'com.example.app.service' })
    expect(listener).toHaveBeenCalledTimes(1)

    AppleAuth.configure({ redirectUri: 'https://app.example.com/callback' })
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    AppleAuth.configure({ scopes: ['email'] })
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('AppleAuth.request iOS', () => {
  it('hashes the nonce and returns the raw value', async () => {
    const native = nativeModule()
    getNative.mockReturnValue(native)
    Platform.OS = 'ios'

    const response = await AppleAuth.request({ nonce: 'raw-nonce', state: 'opaque' })

    expect(response.type).toBe('success')
    if (response.type === 'success') {
      expect(response.data.nonce).toBe('raw-nonce')
      expect(response.data.identityToken).toBe('native.jwt.token')
    }
    expect(native.signIn).toHaveBeenCalledWith({
      nonce: sha256Hex('raw-nonce'),
      state: 'opaque',
      scopes: ['name', 'email'],
      clientId: '',
      redirectUri: '',
    })
  })

  it('does not require Services ID configuration', async () => {
    getNative.mockReturnValue(nativeModule())
    Platform.OS = 'ios'
    const response = await AppleAuth.request()
    expect(response.type).toBe('success')
  })

  it('passes the iOS-only name fields to credential.user', async () => {
    getNative.mockReturnValue(
      nativeModule({
        signIn: jest.fn().mockResolvedValue({
          ...nativeResult,
          middleName: 'Byron',
          namePrefix: 'Dr.',
          nameSuffix: 'Jr.',
          nickname: 'Ace',
        }),
      })
    )

    const credential = await AppleAuth.signIn()

    expect(credential.user).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
      givenName: 'Ada',
      familyName: 'Lovelace',
      middleName: 'Byron',
      namePrefix: 'Dr.',
      nameSuffix: 'Jr.',
      nickname: 'Ace',
    })
  })

  it('sets the iOS-only name fields to null when the native result omits them', async () => {
    getNative.mockReturnValue(nativeModule())

    const credential = await AppleAuth.signIn()

    expect(credential.user).toMatchObject({
      middleName: null,
      namePrefix: null,
      nameSuffix: null,
      nickname: null,
    })
  })

  it('returns cancelled when the native module uses ERR_REQUEST_CANCELED', async () => {
    getNative.mockReturnValue(
      nativeModule({
        signIn: jest.fn().mockRejectedValue({
          code: EAppleAuthErrorCode.Canceled,
          message: 'canceled',
        }),
      })
    )

    const response = await AppleAuth.request()
    expect(response).toEqual({ type: 'cancelled' })
  })

  it('signIn throws the cancel code Clerk already handles', async () => {
    getNative.mockReturnValue(
      nativeModule({
        signIn: jest.fn().mockRejectedValue({ code: '1001', message: 'canceled' }),
      })
    )

    try {
      await AppleAuth.signIn()
      throw new Error('expected signIn to throw')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.Canceled })
    }
  })

  it('returns ERR_NOT_AVAILABLE when the native module is missing', async () => {
    getNative.mockReturnValue(null)
    const response = await AppleAuth.request()
    expect(response).toMatchObject({
      type: 'error',
      code: EAppleAuthErrorCode.NotAvailable,
    })
    if (response.type === 'error') {
      expect(response.message).toMatch(/native module is not linked/i)
      expect(response.message).toMatch(/rebuild/i)
    }
  })

  it('returns the native rejection as cause', async () => {
    const native = Object.assign(
      new Error('A Sign in with Apple request is already in progress.'),
      { code: EAppleAuthErrorCode.Failed }
    )
    getNative.mockReturnValue(nativeModule({ signIn: jest.fn().mockRejectedValue(native) }))

    const response = await AppleAuth.request()
    expect(response).toMatchObject({
      type: 'error',
      code: EAppleAuthErrorCode.Failed,
      message: 'A Sign in with Apple request is already in progress.',
    })
    if (response.type === 'error') {
      expect(response.cause).toBe(native)
    }
  })
})

describe('AppleAuth.request Android', () => {
  it('rejects with ERR_NOT_CONFIGURED without a Services ID', async () => {
    Platform.OS = 'android'
    getNative.mockReturnValue(nativeModule())
    const response = await AppleAuth.request()
    expect(response).toMatchObject({
      type: 'error',
      code: EAppleAuthErrorCode.NotConfigured,
    })
    expect(getNative).not.toHaveBeenCalled()
  })

  it('routes through the native module after configure', async () => {
    Platform.OS = 'android'
    const native = nativeModule()
    getNative.mockReturnValue(native)
    AppleAuth.configure({
      clientId: 'com.example.app.service',
      redirectUri: 'https://app.example.com/callback',
    })

    const response = await AppleAuth.request({ nonce: 'android-nonce' })
    expect(response.type).toBe('success')
    expect(webSign).not.toHaveBeenCalled()
    expect(native.signIn).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: sha256Hex('android-nonce'),
        clientId: 'com.example.app.service',
        redirectUri: 'https://app.example.com/callback',
      })
    )
  })
})

describe('AppleAuth.request web', () => {
  it('requires configure and uses the Apple JS adapter', async () => {
    Platform.OS = 'web'
    const response = await AppleAuth.request()
    expect(response).toMatchObject({
      type: 'error',
      code: EAppleAuthErrorCode.NotConfigured,
    })
    expect(webSign).not.toHaveBeenCalled()

    AppleAuth.configure({
      clientId: 'com.example.app.service',
      redirectUri: 'https://app.example.com/callback',
    })
    webSign.mockResolvedValue(nativeResult)

    const success = await AppleAuth.request({ nonce: 'web-nonce', state: 'web-state' })
    expect(success.type).toBe('success')
    expect(webSign).toHaveBeenCalledWith({
      nonce: sha256Hex('web-nonce'),
      state: 'web-state',
      scopes: ['name', 'email'],
      clientId: 'com.example.app.service',
      redirectUri: 'https://app.example.com/callback',
    })
    expect(getNative).not.toHaveBeenCalled()
  })

  it('returns cancelled when Apple JS reports a popup close', async () => {
    Platform.OS = 'web'
    AppleAuth.configure({
      clientId: 'com.example.app.service',
      redirectUri: 'https://app.example.com/callback',
    })
    webSign.mockRejectedValue({
      code: EAppleAuthErrorCode.Canceled,
      message: 'The user canceled Apple sign-in.',
    })

    await expect(AppleAuth.request()).resolves.toEqual({ type: 'cancelled' })
  })

  it('signIn rethrows the Apple JS error as cause', async () => {
    Platform.OS = 'web'
    AppleAuth.configure({
      clientId: 'com.example.app.service',
      redirectUri: 'https://app.example.com/callback',
    })
    const appleJsError = Object.assign(new Error('Apple JS reported popup_blocked_by_browser.'), {
      code: EAppleAuthErrorCode.Failed,
    })
    webSign.mockRejectedValue(appleJsError)

    const response = await AppleAuth.request()
    expect(response).toMatchObject({ type: 'error', code: EAppleAuthErrorCode.Failed })
    if (response.type === 'error') {
      expect(response.cause).toBe(appleJsError)
    }

    await expect(AppleAuth.signIn()).rejects.toMatchObject({
      name: 'AppleAuthError',
      code: EAppleAuthErrorCode.Failed,
      message: 'Apple JS reported popup_blocked_by_browser.',
      cause: appleJsError,
    })
  })
})

describe('AppleAuth.isAvailable', () => {
  it('uses Apple JS on web and the native module on iOS and Android', async () => {
    Platform.OS = 'web'
    webAvailable.mockReturnValue(true)
    await expect(AppleAuth.isAvailable()).resolves.toBe(true)
    expect(getNative).not.toHaveBeenCalled()

    Platform.OS = 'ios'
    getNative.mockReturnValue(null)
    await expect(AppleAuth.isAvailable()).resolves.toBe(false)

    getNative.mockReturnValue(
      nativeModule({
        isAvailable: () => {
          throw new Error('missing')
        },
      })
    )
    await expect(AppleAuth.isAvailable()).resolves.toBe(false)

    getNative.mockReturnValue(nativeModule())
    await expect(AppleAuth.isAvailable()).resolves.toBe(true)
  })
})

describe('AppleAuth.getCredentialState', () => {
  it('maps iOS native states including numeric codes', async () => {
    Platform.OS = 'ios'
    const getCredentialState = jest
      .fn()
      .mockResolvedValueOnce('revoked')
      .mockResolvedValueOnce('1')
      .mockResolvedValueOnce('2')
      .mockResolvedValueOnce('3')
      .mockResolvedValueOnce('other')
    getNative.mockReturnValue(nativeModule({ getCredentialState }))

    await expect(AppleAuth.getCredentialState('u')).resolves.toBe('revoked')
    await expect(AppleAuth.getCredentialState('u')).resolves.toBe('authorized')
    await expect(AppleAuth.getCredentialState('u')).resolves.toBe('notFound')
    await expect(AppleAuth.getCredentialState('u')).resolves.toBe('transferred')
    await expect(AppleAuth.getCredentialState('u')).resolves.toBe('unknown')
  })

  it('returns unknown on Android and web', async () => {
    Platform.OS = 'ios'
    const native = nativeModule()
    getNative.mockReturnValue(native)
    await AppleAuth.signIn({ nonce: 'n' })
    expect(AppleAuth.getCurrentCredential()?.user.id).toBe('user-1')

    Platform.OS = 'android'
    await expect(AppleAuth.getCredentialState('user-1')).resolves.toBe('unknown')
    await expect(AppleAuth.getCredentialState('other')).resolves.toBe('unknown')

    Platform.OS = 'web'
    await expect(AppleAuth.getCredentialState('user-1')).resolves.toBe('unknown')
    await expect(AppleAuth.getCredentialState('other')).resolves.toBe('unknown')

    await AppleAuth.signOut()
    expect(AppleAuth.getCurrentCredential()).toBeNull()
    await expect(AppleAuth.getCredentialState('user-1')).resolves.toBe('unknown')

    Platform.OS = 'android'
    await expect(AppleAuth.getCredentialState('user-1')).resolves.toBe('unknown')
    expect(native.getCredentialState).not.toHaveBeenCalled()
  })
})

describe('AppleAuth.addRevokeListener', () => {
  it('subscribes to credentialRevoked through the iOS native module', () => {
    Platform.OS = 'ios'
    const remove = jest.fn()
    const addListener = jest.fn(() => ({ remove }))
    getNative.mockReturnValue(nativeModule({ addListener }))
    const listener = jest.fn()

    const subscription = AppleAuth.addRevokeListener(listener)

    expect(addListener).toHaveBeenCalledWith('credentialRevoked', listener)
    expect(subscription).toBe(addListener.mock.results[0].value)
    subscription.remove()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('returns a no-op subscription when the native module has no addListener', () => {
    Platform.OS = 'ios'
    getNative.mockReturnValue(nativeModule())

    const subscription = AppleAuth.addRevokeListener(jest.fn())

    expect(() => subscription.remove()).not.toThrow()
  })

  it('returns a no-op subscription on web without a native module', () => {
    Platform.OS = 'web'
    getNative.mockReturnValue(null)

    const subscription = AppleAuth.addRevokeListener(jest.fn())

    expect(() => subscription.remove()).not.toThrow()
  })
})
