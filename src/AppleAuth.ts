import { Platform } from 'react-native'

import { enrichUserFromToken, toAppleCredential } from './credential'
import {
  AppleAuthError,
  EAppleAuthErrorCode,
  isCancelledError,
  normalizeAppleError,
} from './errors'
import { getNativeAppleModule } from './native-module'
import { generateNonce, sha256Hex } from './nonce'
import type {
  TAppleAuthConfig,
  TAppleAuthResponse,
  TAppleCredential,
  TAppleCredentialState,
  TAppleEventSubscription,
  TAppleScope,
  TAppleSignInOptions,
} from './types'
import { isWebAppleAvailable, webSignIn } from './web/appleJs'

// MARK: - State

let config: TAppleAuthConfig = {}
let lastCredential: TAppleCredential | null = null
const configListeners = new Set<() => void>()

const EDefaultScopes: TAppleScope[] = ['name', 'email']

// MARK: - Helpers

const EMissingNativeModuleMessage =
  'ExpoAppleSignIn native module is not linked. JS alone is not enough: add plugins: ["expo-apple-sign-in"], confirm ios/*.swift and android/.../*.kt exist in the package, then rebuild the development client (pod install / expo prebuild --clean + expo run:ios). Metro reload cannot load a native module.'

function assertNativeModule() {
  const native = getNativeAppleModule()
  if (!native) {
    throw new AppleAuthError(EAppleAuthErrorCode.NotAvailable, EMissingNativeModuleMessage)
  }

  return native
}

function resolvedScopes(override?: TAppleScope[]): TAppleScope[] {
  return override ?? config.scopes ?? EDefaultScopes
}

function requireClientConfig(platformLabel: string) {
  if (!config.clientId || !config.redirectUri) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.NotConfigured,
      `AppleAuth.configure({ clientId, redirectUri }) is required on ${platformLabel}. clientId is the Apple Services ID.`
    )
  }
}

async function performNativeSignIn(params: {
  hashedNonce: string
  state: string
  scopes: TAppleScope[]
}) {
  const native = assertNativeModule()

  return native.signIn({
    nonce: params.hashedNonce,
    state: params.state,
    scopes: params.scopes,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  })
}

/** Subscribes to `AppleAuth.configure` calls. Used by `useAppleAuth`; not part of the public API. */
export function subscribeToConfig(listener: () => void): () => void {
  configListeners.add(listener)

  return () => {
    configListeners.delete(listener)
  }
}

// MARK: - Public API

/**
 * Sign in with Apple on iOS, Android, and web through one API. iOS uses
 * `AuthenticationServices`, Android opens Apple's web flow in a WebView, and web
 * loads Apple's JS SDK. Every platform returns the same credential shape. The
 * library SHA-256-hashes the nonce it sends to Apple and returns the raw nonce
 * on the credential, so callers must not hash it again.
 */
export const AppleAuth = {
  /**
   * Call once at app start. iOS works without this. Android and web need a
   * Services ID and an HTTPS redirect URI from the Apple Developer portal.
   */
  configure(next: TAppleAuthConfig): void {
    const defined = Object.fromEntries(
      Object.entries(next).filter(([, value]) => value !== undefined)
    ) as TAppleAuthConfig
    config = { ...config, ...defined }
    for (const listener of configListeners) {
      listener()
    }
  },

  /** Returns a copy of the current configuration. */
  getConfig(): TAppleAuthConfig {
    return { ...config }
  },

  /** Always true on iOS. On Android and web, true once `clientId` and `redirectUri` are set. */
  isConfigured(): boolean {
    if (Platform.OS === 'ios') {
      return true
    }

    return Boolean(config.clientId && config.redirectUri)
  },

  /**
   * Resolves whether Sign in with Apple can start. Web needs a browser document. iOS and Android
   * ask the native module and resolve false when it is missing or throws.
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return isWebAppleAvailable()
    }
    const native = getNativeAppleModule()
    if (!native) {
      return false
    }
    try {
      return Boolean(native.isAvailable())
    } catch {
      return false
    }
  },

  /**
   * Starts Sign in with Apple and resolves with a credential that already
   * includes the raw `nonce` expected by Supabase and Firebase.
   *
   * Rejects with {@link AppleAuthError} whose `code` is `ERR_REQUEST_CANCELED`
   * when the user dismisses the sheet. The same code Clerk already handles.
   * {@link AppleAuth.request} returns a response object instead of throwing.
   */
  async signIn(options: TAppleSignInOptions = {}): Promise<TAppleCredential> {
    const response = await this.request(options)
    if (response.type === 'success') {
      return response.data
    }
    if (response.type === 'cancelled') {
      throw new AppleAuthError(EAppleAuthErrorCode.Canceled, 'The user canceled Apple sign-in.')
    }

    throw new AppleAuthError(response.code, response.message)
  },

  /**
   * Same flow as {@link AppleAuth.signIn}, but resolves with a `success`, `cancelled`, or `error`
   * response instead of throwing. Mirrors the nitro-google-sign-in response helpers.
   */
  async request(options: TAppleSignInOptions = {}): Promise<TAppleAuthResponse> {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'web') {
        requireClientConfig(Platform.OS)
      }

      if (Platform.OS !== 'web') {
        assertNativeModule()
      }

      const available = await this.isAvailable()
      if (!available) {
        throw new AppleAuthError(
          EAppleAuthErrorCode.NotAvailable,
          'Sign in with Apple is not available on this device.'
        )
      }

      const rawNonce = options.nonce ?? generateNonce()
      const hashedNonce = sha256Hex(rawNonce)
      const state = options.state ?? generateNonce(16)
      const scopes = resolvedScopes(options.scopes)

      const nativeResult =
        Platform.OS === 'web'
          ? await webSignIn({
              nonce: hashedNonce,
              state,
              scopes,
              clientId: config.clientId,
              redirectUri: config.redirectUri,
            })
          : await performNativeSignIn({ hashedNonce, state, scopes })

      const credential = enrichUserFromToken(toAppleCredential(nativeResult, rawNonce))
      lastCredential = credential

      return { type: 'success', data: credential }
    } catch (error) {
      if (isCancelledError(error) || isCancelledError(normalizeAppleError(error))) {
        return { type: 'cancelled' }
      }
      const normalized = normalizeAppleError(error)

      return { type: 'error', code: normalized.code, message: normalized.message }
    }
  },

  /** Returns the credential from the last successful sign-in, kept in memory only, or null. */
  getCurrentCredential(): TAppleCredential | null {
    return lastCredential
  },

  /**
   * Resolves Apple's credential state for `userId` through the iOS native module. Android and web
   * always resolve `'unknown'`, as does iOS when the native module is missing.
   */
  async getCredentialState(userId: string): Promise<TAppleCredentialState> {
    if (Platform.OS !== 'ios') {
      return 'unknown'
    }
    const native = getNativeAppleModule()
    if (!native) {
      return 'unknown'
    }
    const state = await native.getCredentialState(userId)
    switch (state) {
      case 'revoked':
      case '0':
        return 'revoked'
      case 'authorized':
      case '1':
        return 'authorized'
      case 'notFound':
      case '2':
        return 'notFound'
      case 'transferred':
      case '3':
        return 'transferred'
      default:
        return 'unknown'
    }
  },

  /**
   * Subscribes to Apple's credential revoked notification. iOS only; Android and web return a
   * subscription whose `remove` does nothing. Call `remove()` on unmount.
   */
  addRevokeListener(listener: () => void): TAppleEventSubscription {
    const native = getNativeAppleModule()
    if (native && typeof native.addListener === 'function') {
      return native.addListener('credentialRevoked', listener)
    }

    return { remove() {} }
  },

  /**
   * Only clears the in-memory credential, because Apple has no client-side sign-out.
   * Delete your own session (Supabase / Clerk / Firebase) as well.
   */
  async signOut(): Promise<void> {
    lastCredential = null
  },
}
