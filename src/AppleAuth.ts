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
  TAppleScope,
  TAppleSignInOptions,
} from './types'
import { isWebAppleAvailable, webSignIn } from './web/appleJs'

// MARK: - State

let config: TAppleAuthConfig = {}
let lastCredential: TAppleCredential | null = null

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

// MARK: - Public API

export const AppleAuth = {
  /**
   * Call once at app start. iOS works without this. Android and web need a
   * Services ID and an HTTPS redirect URI from the Apple Developer portal.
   */
  configure(next: TAppleAuthConfig): void {
    config = { ...config, ...next }
  },

  getConfig(): TAppleAuthConfig {
    return { ...config }
  },

  isConfigured(): boolean {
    if (Platform.OS === 'ios') {
      return true
    }

    return Boolean(config.clientId && config.redirectUri)
  },

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
   * Same flow as {@link signIn}, but never throws for cancel / failure.
   * Mirrors the nitro-google-sign-in response helpers.
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

  getCurrentCredential(): TAppleCredential | null {
    return lastCredential
  },

  async getCredentialState(userId: string): Promise<TAppleCredentialState> {
    if (Platform.OS !== 'ios') {
      return lastCredential?.user.id === userId ? 'authorized' : 'unknown'
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
   * Clears the in-memory credential. Apple has no real sign-out on iOS.
   * Delete your own session (Supabase / Clerk / Firebase) as well.
   */
  async signOut(): Promise<void> {
    lastCredential = null
  },
}
