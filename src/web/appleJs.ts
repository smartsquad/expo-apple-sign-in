import { AppleAuthError, EAppleAuthErrorCode } from '../errors'
import type { TNativeSignInParams, TNativeSignInResult } from '../types'

const APPLE_JS_SRC =
  'https://appleid.apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

type TAppleJsResponse = {
  authorization?: {
    code?: string
    id_token?: string
    state?: string
  }
  user?: {
    email?: string
    name?: {
      firstName?: string
      lastName?: string
    }
  }
}

type TAppleJsAuth = {
  init: (config: Record<string, unknown>) => void
  signIn: (config?: Record<string, unknown>) => Promise<TAppleJsResponse>
}

function getAppleAuth(): TAppleJsAuth | null {
  const appleId = (globalThis as { AppleID?: { auth?: TAppleJsAuth } }).AppleID
  return appleId?.auth ?? null
}

let scriptPromise: Promise<void> | null = null

function loadAppleScript(): Promise<void> {
  if (getAppleAuth()) {
    return Promise.resolve()
  }
  if (scriptPromise) {
    return scriptPromise
  }
  if (typeof document === 'undefined') {
    return Promise.reject(
      new AppleAuthError(
        EAppleAuthErrorCode.NotAvailable,
        'Apple JS SDK requires a browser document.'
      )
    )
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${APPLE_JS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(
          new AppleAuthError(EAppleAuthErrorCode.NotAvailable, 'Failed to load the Apple JS SDK.')
        )
      )
      return
    }

    const script = document.createElement('script')
    script.src = APPLE_JS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(
        new AppleAuthError(EAppleAuthErrorCode.NotAvailable, 'Failed to load the Apple JS SDK.')
      )
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

function parseUser(
  raw: TAppleJsResponse['user']
): Pick<TNativeSignInResult, 'email' | 'givenName' | 'familyName'> {
  return {
    email: raw?.email ?? null,
    givenName: raw?.name?.firstName ?? null,
    familyName: raw?.name?.lastName ?? null,
  }
}

export async function webSignIn(params: TNativeSignInParams): Promise<TNativeSignInResult> {
  if (!params.clientId) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.NotConfigured,
      'AppleAuth.configure({ clientId, redirectUri }) is required on web. clientId is your Apple Services ID.'
    )
  }
  if (!params.redirectUri) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.NotConfigured,
      'AppleAuth.configure({ redirectUri }) is required on web. Use an HTTPS URL registered to your Services ID.'
    )
  }

  await loadAppleScript()
  const auth = getAppleAuth()
  if (!auth) {
    throw new AppleAuthError(EAppleAuthErrorCode.NotAvailable, 'Apple JS SDK did not initialize.')
  }

  const scope = params.scopes
    .map((value) => (value === 'fullName' ? 'name' : value))
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(' ')

  const config = {
    clientId: params.clientId,
    redirectURI: params.redirectUri,
    scope,
    state: params.state,
    nonce: params.nonce,
    usePopup: true,
  }

  auth.init(config)

  try {
    const response = await auth.signIn(config)
    const identityToken = response.authorization?.id_token
    if (!identityToken) {
      throw new AppleAuthError(
        EAppleAuthErrorCode.MissingIdentityToken,
        'Apple JS SDK returned no identity token.'
      )
    }

    return {
      identityToken,
      authorizationCode: response.authorization?.code ?? null,
      user: null,
      state: response.authorization?.state ?? params.state,
      ...parseUser(response.user),
      realUserStatus: 'unknown',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/popup.*(close|cancel)|user.*cancel/i.test(message)) {
      throw new AppleAuthError(
        EAppleAuthErrorCode.Canceled,
        'The user canceled Apple sign-in.',
        error
      )
    }
    throw error
  }
}

export function isWebAppleAvailable(): boolean {
  return typeof document !== 'undefined'
}
